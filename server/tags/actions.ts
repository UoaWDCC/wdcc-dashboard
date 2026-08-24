"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { createTagSchema, updateTagSchema } from "@/lib/tags/schemas";
import { requireUser } from "@/server/auth/access";
import { createTag, deleteTag, updateTag } from "@/server/tags/mutations";

export async function createTagAction(raw: unknown) {
  const session = await requireUser();
  const created = await createTag(createTagSchema.parse(raw), session.user.id);
  revalidatePath("/tasks");
  return created;
}

export async function updateTagAction(id: string, raw: unknown) {
  await requireUser();
  await updateTag(id, updateTagSchema.parse(raw));
  revalidatePath("/tasks");
}

export async function deleteTagAction(id: string) {
  await requireUser();
  await deleteTag(id);
  revalidatePath("/tasks");
}
