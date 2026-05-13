"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  task,
  taskAssignee,
  taskLink,
  taskTag,
  tag,
  user,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/rbac";

export type ColumnId =
  | { kind: "backlog" }
  | { kind: "done" }
  | { kind: "member"; userId: string };

export type TaskAssigneeView = {
  userId: string;
  name: string;
  position: number;
};

export type TaskTagView = {
  id: string;
  name: string;
  color: string | null;
};

export type TaskLinkView = {
  id: string;
  url: string;
  title: string | null;
};

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  status: "backlog" | "active" | "done";
  priority: "low" | "med" | "high" | null;
  team:
    | "Admin"
    | "Projects"
    | "Tech"
    | "Marketing"
    | "Industry"
    | "Social"
    | null;
  dueDate: string | null;
  startDate: string | null;
  estimateHours: number | null;
  position: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignees: TaskAssigneeView[];
  tags: TaskTagView[];
  links: TaskLinkView[];
};

const POSITION_GAP_MIN = 1e-6;

function midpoint(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1;
  if (before === null) return (after as number) - 1;
  if (after === null) return before + 1;
  return (before + after) / 2;
}

export async function listTasks(): Promise<TaskView[]> {
  await requireUser();

  const rows = await db
    .select()
    .from(task)
    .where(isNull(task.deletedAt))
    .orderBy(asc(task.position));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [assigneeRows, tagRows, linkRows] = await Promise.all([
    db
      .select({
        taskId: taskAssignee.taskId,
        userId: taskAssignee.userId,
        position: taskAssignee.position,
        name: user.name,
      })
      .from(taskAssignee)
      .innerJoin(user, eq(user.id, taskAssignee.userId))
      .where(inArray(taskAssignee.taskId, ids))
      .orderBy(asc(taskAssignee.position)),
    db
      .select({
        taskId: taskTag.taskId,
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })
      .from(taskTag)
      .innerJoin(tag, eq(tag.id, taskTag.tagId))
      .where(inArray(taskTag.taskId, ids)),
    db
      .select()
      .from(taskLink)
      .where(inArray(taskLink.taskId, ids)),
  ]);

  const assigneesByTask = new Map<string, TaskAssigneeView[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({ userId: a.userId, name: a.name, position: a.position });
    assigneesByTask.set(a.taskId, list);
  }
  const tagsByTask = new Map<string, TaskTagView[]>();
  for (const t of tagRows) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }
  const linksByTask = new Map<string, TaskLinkView[]>();
  for (const l of linkRows) {
    const list = linksByTask.get(l.taskId) ?? [];
    list.push({ id: l.id, url: l.url, title: l.title });
    linksByTask.set(l.taskId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    team: r.team,
    dueDate: r.dueDate,
    startDate: r.startDate,
    estimateHours: r.estimateHours,
    position: r.position,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    assignees: assigneesByTask.get(r.id) ?? [],
    tags: tagsByTask.get(r.id) ?? [],
    links: linksByTask.get(r.id) ?? [],
  }));
}

export async function listMembers() {
  await requireUser();
  return db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .orderBy(asc(user.name));
}

export async function listTags() {
  await requireUser();
  return db
    .select({ id: tag.id, name: tag.name, color: tag.color })
    .from(tag)
    .orderBy(asc(tag.name));
}

export async function createTag(input: { name: string; color?: string }) {
  // TODO: gate to admin role once roles exist
  const session = await requireUser();
  const name = input.name.trim().toLowerCase();
  if (!name) throw new Error("Tag name required");
  const [created] = await db
    .insert(tag)
    .values({ name, color: input.color, createdBy: session.user.id })
    .onConflictDoNothing({ target: tag.name })
    .returning();
  return created ?? null;
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: "low" | "med" | "high";
  team?:
    | "Admin"
    | "Projects"
    | "Tech"
    | "Marketing"
    | "Industry"
    | "Social";
  dueDate?: string;
  startDate?: string;
  estimateHours?: number;
  tagIds?: string[];
  links?: { url: string; title?: string }[];
  assigneeUserIds?: string[];
};

export async function createTask(input: CreateTaskInput) {
  const session = await requireUser();
  const trimmed = input.title.trim();
  if (!trimmed) throw new Error("Title required");

  const result = await db.transaction(async (tx) => {
    const status = input.assigneeUserIds?.length ? "active" : "backlog";

    const tailRow = await tx
      .select({ max: sql<number>`coalesce(max(${task.position}), 0)` })
      .from(task)
      .where(and(isNull(task.deletedAt), eq(task.status, status)));
    const newPosition = (tailRow[0]?.max ?? 0) + 1;

    const [inserted] = await tx
      .insert(task)
      .values({
        title: trimmed,
        description: input.description?.trim() || null,
        status,
        priority: input.priority,
        team: input.team,
        dueDate: input.dueDate,
        startDate: input.startDate,
        estimateHours: input.estimateHours,
        position: newPosition,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    if (input.tagIds?.length) {
      await tx
        .insert(taskTag)
        .values(input.tagIds.map((tagId) => ({ taskId: inserted.id, tagId })));
    }
    if (input.links?.length) {
      await tx.insert(taskLink).values(
        input.links.map((l) => ({
          taskId: inserted.id,
          url: l.url,
          title: l.title,
        }))
      );
    }
    if (input.assigneeUserIds?.length) {
      const assigneeValues = await Promise.all(
        input.assigneeUserIds.map(async (userId, i) => {
          const tail = await tx
            .select({
              max: sql<number>`coalesce(max(${taskAssignee.position}), 0)`,
            })
            .from(taskAssignee)
            .where(eq(taskAssignee.userId, userId));
          return {
            taskId: inserted.id,
            userId,
            position: (tail[0]?.max ?? 0) + 1 + i,
            assignedBy: session.user.id,
          };
        })
      );
      await tx.insert(taskAssignee).values(assigneeValues);
    }

    return inserted;
  });

  revalidatePath("/tasks");
  return result;
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: "low" | "med" | "high" | null;
  team?:
    | "Admin"
    | "Projects"
    | "Tech"
    | "Marketing"
    | "Industry"
    | "Social"
    | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimateHours?: number | null;
  tagIds?: string[];
  links?: { url: string; title?: string | null }[];
  assigneeUserIds?: string[];
};

export async function updateTask(id: string, patch: UpdateTaskInput) {
  const session = await requireUser();

  await db.transaction(async (tx) => {
    const fields: Partial<typeof task.$inferInsert> = {
      updatedBy: session.user.id,
    };
    if (patch.title !== undefined) fields.title = patch.title.trim();
    if (patch.description !== undefined)
      fields.description = patch.description?.trim() || null;
    if (patch.priority !== undefined) fields.priority = patch.priority;
    if (patch.team !== undefined) fields.team = patch.team;
    if (patch.dueDate !== undefined) fields.dueDate = patch.dueDate;
    if (patch.startDate !== undefined) fields.startDate = patch.startDate;
    if (patch.estimateHours !== undefined)
      fields.estimateHours = patch.estimateHours;

    await tx.update(task).set(fields).where(eq(task.id, id));

    if (patch.tagIds !== undefined) {
      await tx.delete(taskTag).where(eq(taskTag.taskId, id));
      if (patch.tagIds.length) {
        await tx
          .insert(taskTag)
          .values(patch.tagIds.map((tagId) => ({ taskId: id, tagId })));
      }
    }

    if (patch.links !== undefined) {
      await tx.delete(taskLink).where(eq(taskLink.taskId, id));
      if (patch.links.length) {
        await tx.insert(taskLink).values(
          patch.links.map((l) => ({
            taskId: id,
            url: l.url,
            title: l.title ?? null,
          }))
        );
      }
    }

    if (patch.assigneeUserIds !== undefined) {
      const existing = await tx
        .select({ userId: taskAssignee.userId })
        .from(taskAssignee)
        .where(eq(taskAssignee.taskId, id));
      const existingIds = new Set(existing.map((e) => e.userId));
      const targetIds = new Set(patch.assigneeUserIds);

      const toRemove = [...existingIds].filter((u) => !targetIds.has(u));
      const toAdd = [...targetIds].filter((u) => !existingIds.has(u));

      if (toRemove.length) {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, id),
              inArray(taskAssignee.userId, toRemove)
            )
          );
      }
      for (const userId of toAdd) {
        const tail = await tx
          .select({
            max: sql<number>`coalesce(max(${taskAssignee.position}), 0)`,
          })
          .from(taskAssignee)
          .where(eq(taskAssignee.userId, userId));
        await tx.insert(taskAssignee).values({
          taskId: id,
          userId,
          position: (tail[0]?.max ?? 0) + 1,
          assignedBy: session.user.id,
        });
      }

      const finalCount = targetIds.size;
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

  revalidatePath("/tasks");
}

export async function softDeleteTask(id: string) {
  await requireUser();
  await db
    .update(task)
    .set({ deletedAt: new Date() })
    .where(eq(task.id, id));
  revalidatePath("/tasks");
}

export type MoveTaskInput = {
  taskId: string;
  to: ColumnId;
  from: ColumnId;
  beforeId: string | null;
  afterId: string | null;
};

export async function moveTask(input: MoveTaskInput) {
  const session = await requireUser();
  const { taskId, to, from, beforeId, afterId } = input;

  await db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);
    if (!current[0]) throw new Error("Task not found");

    let nextStatus: "backlog" | "active" | "done" = current[0].status;

    if (to.kind === "backlog") {
      if (from.kind === "member") {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.userId, from.userId)
            )
          );
        const remaining = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(taskAssignee)
          .where(eq(taskAssignee.taskId, taskId));
        if ((remaining[0]?.count ?? 0) === 0) nextStatus = "backlog";
      } else {
        await tx.delete(taskAssignee).where(eq(taskAssignee.taskId, taskId));
        nextStatus = "backlog";
      }
    } else if (to.kind === "done") {
      nextStatus = "done";
    } else {
      nextStatus = "active";
      if (from.kind === "member" && from.userId !== to.userId) {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.userId, from.userId)
            )
          );
      }
      const exists = await tx
        .select({ userId: taskAssignee.userId })
        .from(taskAssignee)
        .where(
          and(
            eq(taskAssignee.taskId, taskId),
            eq(taskAssignee.userId, to.userId)
          )
        )
        .limit(1);
      if (!exists[0]) {
        await tx.insert(taskAssignee).values({
          taskId,
          userId: to.userId,
          position: 0,
          assignedBy: session.user.id,
        });
      }
    }

    const beforePos = beforeId
      ? await getNeighborPosition(tx, beforeId, to)
      : null;
    const afterPos = afterId
      ? await getNeighborPosition(tx, afterId, to)
      : null;
    let newPos = midpoint(beforePos, afterPos);

    if (
      beforePos !== null &&
      afterPos !== null &&
      Math.abs(afterPos - beforePos) < POSITION_GAP_MIN
    ) {
      newPos = await rebalanceColumn(tx, to, taskId, beforeId, afterId);
    }

    if (to.kind === "member") {
      await tx
        .update(taskAssignee)
        .set({ position: newPos })
        .where(
          and(
            eq(taskAssignee.taskId, taskId),
            eq(taskAssignee.userId, to.userId)
          )
        );
    } else {
      await tx
        .update(task)
        .set({
          position: newPos,
          status: nextStatus,
          completedAt: nextStatus === "done" ? new Date() : null,
          updatedBy: session.user.id,
        })
        .where(eq(task.id, taskId));
    }

    if (to.kind === "member" && nextStatus !== current[0].status) {
      await tx
        .update(task)
        .set({
          status: nextStatus,
          completedAt: null,
          updatedBy: session.user.id,
        })
        .where(eq(task.id, taskId));
    }
  });

  revalidatePath("/tasks");
}

async function getNeighborPosition(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  neighborTaskId: string,
  col: ColumnId
): Promise<number | null> {
  if (col.kind === "member") {
    const r = await tx
      .select({ position: taskAssignee.position })
      .from(taskAssignee)
      .where(
        and(
          eq(taskAssignee.taskId, neighborTaskId),
          eq(taskAssignee.userId, col.userId)
        )
      )
      .limit(1);
    return r[0]?.position ?? null;
  }
  const r = await tx
    .select({ position: task.position })
    .from(task)
    .where(eq(task.id, neighborTaskId))
    .limit(1);
  return r[0]?.position ?? null;
}

async function rebalanceColumn(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  col: ColumnId,
  movingTaskId: string,
  beforeId: string | null,
  afterId: string | null
): Promise<number> {
  if (col.kind === "member") {
    const rows = await tx
      .select({ taskId: taskAssignee.taskId, position: taskAssignee.position })
      .from(taskAssignee)
      .where(eq(taskAssignee.userId, col.userId))
      .orderBy(asc(taskAssignee.position));
    return assignSpacedPositions(rows, movingTaskId, beforeId, afterId, async (taskId, position) => {
      await tx
        .update(taskAssignee)
        .set({ position })
        .where(
          and(
            eq(taskAssignee.taskId, taskId),
            eq(taskAssignee.userId, col.userId)
          )
        );
    });
  }
  const targetStatus = col.kind === "done" ? "done" : "backlog";
  const rows = await tx
    .select({ taskId: task.id, position: task.position })
    .from(task)
    .where(and(eq(task.status, targetStatus), isNull(task.deletedAt)))
    .orderBy(asc(task.position));
  return assignSpacedPositions(rows, movingTaskId, beforeId, afterId, async (taskId, position) => {
    await tx.update(task).set({ position }).where(eq(task.id, taskId));
  });
}

async function assignSpacedPositions(
  rows: { taskId: string; position: number }[],
  movingTaskId: string,
  beforeId: string | null,
  afterId: string | null,
  write: (taskId: string, position: number) => Promise<void>
): Promise<number> {
  const filtered = rows.filter((r) => r.taskId !== movingTaskId);
  let insertIdx = filtered.length;
  if (afterId) {
    const i = filtered.findIndex((r) => r.taskId === afterId);
    if (i >= 0) insertIdx = i;
  } else if (beforeId) {
    const i = filtered.findIndex((r) => r.taskId === beforeId);
    if (i >= 0) insertIdx = i + 1;
  }
  const reordered = [
    ...filtered.slice(0, insertIdx),
    { taskId: movingTaskId, position: 0 },
    ...filtered.slice(insertIdx),
  ];
  let movedPos = 0;
  for (let i = 0; i < reordered.length; i++) {
    const newPos = (i + 1) * 1;
    if (reordered[i].taskId === movingTaskId) movedPos = newPos;
    else await write(reordered[i].taskId, newPos);
  }
  return movedPos;
}
