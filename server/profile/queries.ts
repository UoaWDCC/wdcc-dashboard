import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { profile } from "@/server/db/schema";
import { normalizeEmail } from "@/lib/profile";

export async function isAllowed(email: string) {
  const normalized = normalizeEmail(email);
  const hit = await db
    .select({ email: profile.email })
    .from(profile)
    .where(eq(profile.email, normalized))
    .limit(1);
  return hit.length > 0;
}

export async function getProfile(email: string) {
  const rows = await db
    .select()
    .from(profile)
    .where(eq(profile.email, normalizeEmail(email)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listProfiles() {
  return db.select().from(profile).orderBy(profile.email);
}
