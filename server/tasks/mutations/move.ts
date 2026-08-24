import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import { task, taskAssignee } from "@/server/db/schema";
import { POSITION_GAP_MIN, midpoint } from "@/lib/tasks/position";
import type { ColumnId, MoveTaskInput } from "@/lib/tasks/types";

function columnLockKey(col: ColumnId): number {
  const s = col.kind === "user" ? `user:${col.profileEmail}` : col.kind;
  // djb2-ish 32-bit hash; pg_advisory_xact_lock takes int8
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) | 0;
  return h;
}

async function lockColumns(tx: Tx, a: ColumnId, b: ColumnId): Promise<void> {
  const ka = columnLockKey(a);
  const kb = columnLockKey(b);
  const [first, second] = ka <= kb ? [ka, kb] : [kb, ka];
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${first})`);
  if (second !== first) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${second})`);
  }
}

export async function moveTask(input: MoveTaskInput, userId: string) {
  const { taskId, to, from, beforeId, afterId } = input;

  await db.transaction(async (tx) => {
    await lockColumns(tx, from, to);

    const current = await tx
      .select()
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);
    if (!current[0]) throw new Error("Task not found");

    const prevStatus = current[0].status;
    const prevCompletedAt = current[0].completedAt;
    let nextStatus: "backlog" | "active" | "done" = prevStatus;
    let assigneeExists = false;

    if (to.kind === "backlog") {
      if (from.kind === "user") {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, from.profileEmail)
            )
          );
        const remaining = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(taskAssignee)
          .where(eq(taskAssignee.taskId, taskId));
        nextStatus = (remaining[0]?.count ?? 0) === 0 ? "backlog" : "active";
      } else {
        // Backlog invariant: zero assignees. Wipe all when dropping in from
        // non-user columns (e.g. done → backlog) to keep status/assignee in sync.
        await tx.delete(taskAssignee).where(eq(taskAssignee.taskId, taskId));
        nextStatus = "backlog";
      }
    } else if (to.kind === "done") {
      nextStatus = "done";
    } else {
      nextStatus = "active";
      if (from.kind === "user" && from.profileEmail !== to.profileEmail) {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, from.profileEmail)
            )
          );
      }
      const exists = await tx
        .select({ profileEmail: taskAssignee.profileEmail })
        .from(taskAssignee)
        .where(
          and(
            eq(taskAssignee.taskId, taskId),
            eq(taskAssignee.profileEmail, to.profileEmail)
          )
        )
        .limit(1);
      assigneeExists = !!exists[0];
    }

    const isDone = nextStatus === "done";
    const wasDone = prevStatus === "done";
    const completedAt =
      isDone && !wasDone
        ? new Date()
        : !isDone && wasDone
          ? null
          : prevCompletedAt;

    // Dropped on backlog but other assignees keep the task active: the visual
    // effect is "remove me from this user column". No backlog-relative position
    // computation; do not write task.position (it'd pollute the active task
    // with a backlog midpoint).
    if (to.kind === "backlog" && nextStatus === "active") {
      await tx
        .update(task)
        .set({ status: nextStatus, completedAt, updatedBy: userId })
        .where(eq(task.id, taskId));
      return;
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

    if (to.kind === "user") {
      if (assigneeExists) {
        await tx
          .update(taskAssignee)
          .set({ position: newPos })
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, to.profileEmail)
            )
          );
      } else {
        await tx.insert(taskAssignee).values({
          taskId,
          profileEmail: to.profileEmail,
          position: newPos,
          assignedBy: userId,
        });
      }
      // Clear stale task.position carried from prior backlog/done column.
      // task.position is meaningless for active rows (ordered via taskAssignee).
      await tx
        .update(task)
        .set({
          status: nextStatus,
          position: 0,
          completedAt,
          updatedBy: userId,
        })
        .where(eq(task.id, taskId));
    } else {
      await tx
        .update(task)
        .set({
          position: newPos,
          status: nextStatus,
          completedAt,
          updatedBy: userId,
        })
        .where(eq(task.id, taskId));
    }
  });
}

async function getNeighborPosition(
  tx: Tx,
  neighborTaskId: string,
  col: ColumnId
): Promise<number | null> {
  if (col.kind === "user") {
    const r = await tx
      .select({ position: taskAssignee.position })
      .from(taskAssignee)
      .where(
        and(
          eq(taskAssignee.taskId, neighborTaskId),
          eq(taskAssignee.profileEmail, col.profileEmail)
        )
      )
      .for("update")
      .limit(1);
    return r[0]?.position ?? null;
  }
  const r = await tx
    .select({ position: task.position })
    .from(task)
    .where(eq(task.id, neighborTaskId))
    .for("update")
    .limit(1);
  return r[0]?.position ?? null;
}

async function rebalanceColumn(
  tx: Tx,
  col: ColumnId,
  movingTaskId: string,
  beforeId: string | null,
  afterId: string | null
): Promise<number> {
  if (col.kind === "user") {
    const rows = await tx
      .select({ taskId: taskAssignee.taskId, position: taskAssignee.position })
      .from(taskAssignee)
      .where(eq(taskAssignee.profileEmail, col.profileEmail))
      .orderBy(asc(taskAssignee.position));
    return assignSpacedPositions(
      rows,
      movingTaskId,
      beforeId,
      afterId,
      async (taskId, position) => {
        await tx
          .update(taskAssignee)
          .set({ position })
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, col.profileEmail)
            )
          );
      }
    );
  }
  const targetStatus = col.kind === "done" ? "done" : "backlog";
  const rows = await tx
    .select({ taskId: task.id, position: task.position })
    .from(task)
    .where(and(eq(task.status, targetStatus), isNull(task.deletedAt)))
    .orderBy(asc(task.position));
  return assignSpacedPositions(
    rows,
    movingTaskId,
    beforeId,
    afterId,
    async (taskId, position) => {
      await tx.update(task).set({ position }).where(eq(task.id, taskId));
    }
  );
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
