import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { tag } from "@/server/db/schema";
import type { CreateTagInput, UpdateTagInput } from "@/lib/tags/schemas";

export async function createTag(data: CreateTagInput, userId: string) {
  const [created] = await db
    .insert(tag)
    .values({ name: data.name, color: data.color, createdBy: userId })
    .onConflictDoNothing({ target: tag.name })
    .returning();
  return created ?? null;
}

export async function updateTag(id: string, patch: UpdateTagInput) {
  const fields: UpdateTagInput = {};
  if (patch.name !== undefined) fields.name = patch.name;
  if (patch.color !== undefined) fields.color = patch.color;
  if (Object.keys(fields).length === 0) return;
  await db.update(tag).set(fields).where(eq(tag.id, id));
}

export async function deleteTag(id: string) {
  await db.delete(tag).where(eq(tag.id, id));
}
