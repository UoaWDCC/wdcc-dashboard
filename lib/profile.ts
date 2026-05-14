import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";

export type Team =
  | "Admin"
  | "Projects"
  | "Tech"
  | "Marketing"
  | "Industry"
  | "Social";

export type ProfileKind = "personal" | "shared";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

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

export async function upsertProfile(input: {
  email: string;
  name: string;
  team: Team | null;
  kind: ProfileKind;
  note?: string | null;
  createdBy?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const values = {
    email,
    name: input.name.trim(),
    team: input.team,
    kind: input.kind,
    note: input.note?.trim() || null,
    createdBy: input.createdBy ?? null,
  };
  await db
    .insert(profile)
    .values(values)
    .onConflictDoUpdate({
      target: profile.email,
      set: {
        name: values.name,
        team: values.team,
        kind: values.kind,
        note: values.note,
      },
    });
}

export async function removeProfile(email: string) {
  await db.delete(profile).where(eq(profile.email, normalizeEmail(email)));
}
