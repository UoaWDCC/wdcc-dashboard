"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { profile, task, taskAssignee } from "@/server/db/schema";
import { requireUser } from "@/server/auth/access";
import { normalizeEmail } from "@/lib/profile";
import { upsertProfile } from "@/server/profile/mutations";
import { syncDocsAccessGroup } from "@/server/cloudflare";
import { TEAMS, PROFILE_KINDS } from "@/lib/types";
import {
  parseEmail,
  parseEnum,
  parseRequiredString,
  parseString,
} from "@/lib/form-parser";

export async function upsertProfileAction(formData: FormData) {
  const session = await requireUser("/admin");
  const email = parseEmail(formData, "email");
  const name = parseRequiredString(formData, "name");
  const team = parseEnum(formData, "team", TEAMS);
  const kind = parseEnum(formData, "kind", PROFILE_KINDS);
  if (!kind) throw new Error("Missing or invalid field: kind");
  const note = parseString(formData, "note");
  await upsertProfile({
    email,
    name,
    team,
    kind,
    note,
    createdBy: session.user.id,
  });
  scheduleDocsSync("upsertProfileAction");
  revalidatePath("/admin");
  revalidatePath("/tasks");
}

// Fire CF sync after response so admins aren't blocked on Cloudflare latency
// (worst-case two sequential ~10s API calls). On failure the DB truth stands
// and the operator can reconcile via Resync.
function scheduleDocsSync(context: string) {
  after(async () => {
    try {
      await syncDocsAccessGroup();
    } catch (err) {
      console.error(`[${context}] syncDocsAccessGroup failed:`, err);
    }
  });
}

export async function removeProfileAction(formData: FormData) {
  await requireUser("/admin");
  const raw = parseRequiredString(formData, "email");
  const email = normalizeEmail(raw);
  await db.transaction(async (tx) => {
    // Capture tasks currently assigned to this profile before cascade delete,
    // so demotion only touches those tasks (not unrelated active rows that
    // happen to be assignee-less due to other bugs/races).
    const affected = await tx
      .select({ taskId: taskAssignee.taskId })
      .from(taskAssignee)
      .where(eq(taskAssignee.profileEmail, email));

    const deleted = await tx
      .delete(profile)
      .where(eq(profile.email, email))
      .returning({ email: profile.email });
    if (!deleted.length) return;

    if (!affected.length) return;
    const affectedIds = [...new Set(affected.map((r) => r.taskId))];

    // Tail position for backlog so demoted tasks land at the end with a fresh
    // monotonic position (active rows store position=0; reusing that collides).
    const tailRow = await tx
      .select({ max: sql<number>`coalesce(max(${task.position}), 0)` })
      .from(task)
      .where(and(eq(task.status, "backlog"), isNull(task.deletedAt)));
    let nextPos = Number(tailRow[0]?.max ?? 0);

    const toDemote = await tx
      .select({ id: task.id })
      .from(task)
      .where(
        and(
          inArray(task.id, affectedIds),
          eq(task.status, "active"),
          isNull(task.deletedAt),
          sql`NOT EXISTS (SELECT 1 FROM ${taskAssignee} WHERE ${taskAssignee.taskId} = ${task.id})`
        )
      );

    for (const row of toDemote) {
      nextPos += 1;
      await tx
        .update(task)
        .set({ status: "backlog", position: nextPos })
        .where(eq(task.id, row.id));
    }
  });
  // Removal is security-sensitive: revoking a user must actually close their
  // docs access before we return success. Run the CF sync inline (worst case
  // ~10s per API call, capped by AbortSignal) and surface failure so the admin
  // knows to retry via the Resync button instead of a silent stale allowlist.
  await syncDocsAccessGroup();
  revalidatePath("/admin");
  revalidatePath("/tasks");
}

export type ResyncResult = { ok: true } | { ok: false; error: string };

export async function resyncDocsAccessGroupAction(): Promise<ResyncResult> {
  await requireUser("/admin");
  try {
    await syncDocsAccessGroup();
    return { ok: true };
  } catch (err) {
    // Return the error text instead of throwing: Next masks thrown server-action
    // errors in production, so the client would otherwise show a generic message.
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}
