import "server-only";

import { asc } from "drizzle-orm";
import { db } from "@/server/db";
import { tag } from "@/server/db/schema";
import type { TagView } from "@/lib/tags/types";

export async function listTags(): Promise<TagView[]> {
  return db
    .select({ id: tag.id, name: tag.name, color: tag.color })
    .from(tag)
    .orderBy(asc(tag.name));
}
