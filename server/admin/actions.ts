"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { profile, task, taskAssignee } from "@/lib/db/schema";
import { requireUser } from "@/lib/rbac";
import {
  upsertProfile,
  normalizeEmail,
  type Team,
  type ProfileKind,
} from "@/lib/profile";

const TEAMS: readonly Team[] = [
  "Admin",
  "Projects",
  "Tech",
  "Marketing",
  "Industry",
  "Social",
];

function parseTeam(raw: string | null): Team | null {
  if (!raw) return null;
  return (TEAMS as readonly string[]).includes(raw) ? (raw as Team) : null;
}

function parseKind(raw: string | null): ProfileKind {
  return raw === "shared" ? "shared" : "personal";
}

export async function upsertProfileAction(formData: FormData) {
  const session = await requireUser("/admin");
  const email = (formData.get("email") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  if (!email || !name) return;
  const team = parseTeam(formData.get("team") as string | null);
  const kind = parseKind(formData.get("kind") as string | null);
  const note = (formData.get("note") as string | null)?.trim() || null;
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
  const raw = formData.get("email");
  if (typeof raw !== "string" || !raw.trim()) return;
  const email = normalizeEmail(raw);
  await db.transaction(async (tx) => {
    await tx.delete(profile).where(eq(profile.email, email));
    await tx
      .update(task)
      .set({ status: "backlog" })
      .where(
        and(
          eq(task.status, "active"),
          isNull(task.deletedAt),
          sql`NOT EXISTS (SELECT 1 FROM ${taskAssignee} WHERE ${taskAssignee.taskId} = ${task.id})`
        )
      );
  });
  revalidatePath("/admin");
  revalidatePath("/tasks");
}
