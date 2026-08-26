"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "@/lib/tasks/schemas";
import type { BoardData } from "@/lib/tasks/types";
import { requireUser } from "@/server/auth/access";
import { moveTask } from "@/server/tasks/mutations/move";
import {
  createTask,
  softDeleteTask,
  updateTask,
} from "@/server/tasks/mutations/task";
import { getBoardVersion, listTasks, listUsers } from "@/server/tasks/queries";
import { listTags } from "@/server/tags/queries";

// The board's only published read: one round trip instead of three, so a
// refetch after a mutation does not waterfall.
export async function getBoardAction(): Promise<BoardData> {
  await requireUser();
  const [tasks, users, tags, version] = await Promise.all([
    listTasks(),
    listUsers(),
    listTags(),
    getBoardVersion(),
  ]);
  return { tasks, users, tags, version };
}

export async function getBoardVersionAction(): Promise<string> {
  await requireUser();
  return getBoardVersion();
}

export async function createTaskAction(raw: unknown) {
  const session = await requireUser();
  const created = await createTask(
    createTaskSchema.parse(raw),
    session.user.id
  );
  revalidatePath("/tasks");
  return created;
}

export async function updateTaskAction(id: string, raw: unknown) {
  const session = await requireUser();
  await updateTask(id, updateTaskSchema.parse(raw), session.user.id);
  revalidatePath("/tasks");
}

export async function softDeleteTaskAction(id: string) {
  const session = await requireUser();
  await softDeleteTask(id, session.user.id);
  revalidatePath("/tasks");
}

export async function moveTaskAction(raw: unknown) {
  const session = await requireUser();
  await moveTask(moveTaskSchema.parse(raw), session.user.id);
  revalidatePath("/tasks");
}
