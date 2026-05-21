"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profile, task, taskAssignee } from "@/lib/db/schema";
import { requireUser } from "@/lib/rbac";
import { upsertProfile, normalizeEmail } from "@/lib/profile";
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
  const kind = parseEnum(formData, "kind", PROFILE_KINDS) ?? "personal";
  const note = parseString(formData, "note");
  await upsertProfile({
    email,
    name,
    team,
    kind,
    note,
    createdBy: session.user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/tasks");
}

export async function removeProfileAction(formData: FormData) {
  await requireUser("/admin");
  const raw = parseString(formData, "email");
  if (!raw) return;
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
  revalidatePath("/admin");
  revalidatePath("/tasks");
}
