import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import {
  task,
  taskAssignee,
  taskLink,
  taskTag,
  profile,
} from "@/server/db/schema";
import type { CreateTaskInput, UpdateTaskInput } from "@/lib/tasks/types";

const ALLOWED_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);

function validateLinkUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid link URL: ${raw}`);
  }
  if (!ALLOWED_LINK_SCHEMES.has(parsed.protocol)) {
    throw new Error(`Unsupported link scheme: ${parsed.protocol}`);
  }
  return parsed.toString();
}

const dedupe = <T>(xs: T[] | undefined): T[] => (xs ? [...new Set(xs)] : []);

async function assertProfilesExist(tx: Tx, emails: string[]): Promise<void> {
  if (!emails.length) return;
  const rows = await tx
    .select({ email: profile.email })
    .from(profile)
    .where(and(inArray(profile.email, emails), eq(profile.kind, "personal")));
  const known = new Set(rows.map((r) => r.email));
  const unknown = emails.filter((e) => !known.has(e));
  if (unknown.length) {
    throw new Error(`Unknown assignee email(s): ${unknown.join(", ")}`);
  }
}

export async function createTask(data: CreateTaskInput, userId: string) {
  const tagIds = dedupe(data.tagIds);
  const assigneeEmails = dedupe(data.assigneeEmails);

  return db.transaction(async (tx) => {
    await assertProfilesExist(tx, assigneeEmails);
    const status = assigneeEmails.length ? "active" : "backlog";

    const tailRow = await tx
      .select({ max: sql<number>`coalesce(max(${task.position}), 0)` })
      .from(task)
      .where(and(isNull(task.deletedAt), eq(task.status, status)));
    const newPosition = (tailRow[0]?.max ?? 0) + 1;

    const [inserted] = await tx
      .insert(task)
      .values({
        title: data.title,
        description: data.description?.trim() || null,
        status,
        priority: data.priority,
        team: data.team,
        dueDate: data.dueDate,
        startDate: data.startDate,
        estimateHours: data.estimateHours,
        position: newPosition,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    if (tagIds.length) {
      await tx
        .insert(taskTag)
        .values(tagIds.map((tagId) => ({ taskId: inserted.id, tagId })));
    }
    if (data.links?.length) {
      await tx.insert(taskLink).values(
        data.links.map((l) => ({
          taskId: inserted.id,
          url: validateLinkUrl(l.url),
          title: l.title,
        }))
      );
    }
    if (assigneeEmails.length) {
      const maxRows = await tx
        .select({
          profileEmail: taskAssignee.profileEmail,
          max: sql<number>`coalesce(max(${taskAssignee.position}), 0)`,
        })
        .from(taskAssignee)
        .where(inArray(taskAssignee.profileEmail, assigneeEmails))
        .groupBy(taskAssignee.profileEmail);
      const maxByEmail = new Map(
        maxRows.map((r) => [r.profileEmail, Number(r.max)])
      );
      const assigneeValues = assigneeEmails.map((email, i) => ({
        taskId: inserted.id,
        profileEmail: email,
        position: (maxByEmail.get(email) ?? 0) + 1 + i,
        assignedBy: userId,
      }));
      await tx.insert(taskAssignee).values(assigneeValues);
    }

    return inserted;
  });
}

export async function updateTask(
  id: string,
  data: UpdateTaskInput,
  userId: string
) {
  await db.transaction(async (tx) => {
    const fields: Partial<typeof task.$inferInsert> = {
      updatedBy: userId,
    };
    if (data.title !== undefined) fields.title = data.title;
    if (data.description !== undefined)
      fields.description = data.description?.trim() || null;
    if (data.priority !== undefined) fields.priority = data.priority;
    if (data.team !== undefined) fields.team = data.team;
    if (data.dueDate !== undefined) fields.dueDate = data.dueDate;
    if (data.startDate !== undefined) fields.startDate = data.startDate;
    if (data.estimateHours !== undefined)
      fields.estimateHours = data.estimateHours;

    await tx.update(task).set(fields).where(eq(task.id, id));

    if (data.tagIds !== undefined) {
      const tagIds = dedupe(data.tagIds);
      await tx.delete(taskTag).where(eq(taskTag.taskId, id));
      if (tagIds.length) {
        await tx
          .insert(taskTag)
          .values(tagIds.map((tagId) => ({ taskId: id, tagId })));
      }
    }

    if (data.links !== undefined) {
      await tx.delete(taskLink).where(eq(taskLink.taskId, id));
      if (data.links.length) {
        await tx.insert(taskLink).values(
          data.links.map((l) => ({
            taskId: id,
            url: validateLinkUrl(l.url),
            title: l.title ?? null,
          }))
        );
      }
    }

    if (data.assigneeEmails !== undefined) {
      const targetList = dedupe(data.assigneeEmails);
      await assertProfilesExist(tx, targetList);
      const existing = await tx
        .select({ profileEmail: taskAssignee.profileEmail })
        .from(taskAssignee)
        .where(eq(taskAssignee.taskId, id));
      const existingEmails = new Set(existing.map((e) => e.profileEmail));
      const targetEmails = new Set(targetList);

      const toRemove = [...existingEmails].filter((u) => !targetEmails.has(u));
      const toAdd = [...targetEmails].filter((u) => !existingEmails.has(u));

      if (toRemove.length) {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, id),
              inArray(taskAssignee.profileEmail, toRemove)
            )
          );
      }
      if (toAdd.length) {
        const maxRows = await tx
          .select({
            profileEmail: taskAssignee.profileEmail,
            max: sql<number>`coalesce(max(${taskAssignee.position}), 0)`,
          })
          .from(taskAssignee)
          .where(inArray(taskAssignee.profileEmail, toAdd))
          .groupBy(taskAssignee.profileEmail);
        const maxByEmail = new Map(
          maxRows.map((r) => [r.profileEmail, Number(r.max)])
        );
        await tx.insert(taskAssignee).values(
          toAdd.map((email) => ({
            taskId: id,
            profileEmail: email,
            position: (maxByEmail.get(email) ?? 0) + 1,
            assignedBy: userId,
          }))
        );
      }

      const finalCount = targetEmails.size;
      const current = await tx
        .select({ status: task.status })
        .from(task)
        .where(eq(task.id, id))
        .limit(1);
      if (current[0]?.status !== "done") {
        await tx
          .update(task)
          .set({ status: finalCount > 0 ? "active" : "backlog" })
          .where(eq(task.id, id));
      }
    }
  });
}

export async function softDeleteTask(id: string, userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(taskAssignee).where(eq(taskAssignee.taskId, id));
    await tx
      .update(task)
      .set({ deletedAt: new Date(), updatedBy: userId })
      .where(eq(task.id, id));
  });
}
