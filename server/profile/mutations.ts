import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { profile } from "@/server/db/schema";
import { normalizeEmail } from "@/lib/profile";
import type { Team, ProfileKind } from "@/lib/types";

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
