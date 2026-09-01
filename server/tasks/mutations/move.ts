import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { task, taskAssignee } from "@/server/db/schema";
import type { MoveTaskInput } from "@/lib/tasks/types";

export async function moveTask(input: MoveTaskInput, userId: string) {
  const { taskId, to, from } = input;

  await db.transaction(async (tx) => {
    const current = await tx
      .select()
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);
    if (!current[0]) throw new Error("Task not found");

    const prevStatus = current[0].status;
    const prevCompletedAt = current[0].completedAt;
    let nextStatus: "backlog" | "active" | "done" = prevStatus;

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
      await tx
        .insert(taskAssignee)
        .values({
          taskId,
          profileEmail: to.profileEmail,
          assignedBy: userId,
        })
        .onConflictDoNothing();
    }

    const isDone = nextStatus === "done";
    const wasDone = prevStatus === "done";
    const completedAt =
      isDone && !wasDone
        ? new Date()
        : !isDone && wasDone
          ? null
          : prevCompletedAt;

    await tx
      .update(task)
      .set({ status: nextStatus, completedAt, updatedBy: userId })
      .where(eq(task.id, taskId));
  });
}
