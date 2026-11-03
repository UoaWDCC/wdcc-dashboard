import "server-only";

import { db } from "@/server/db";
import { checkIn } from "@/server/db/schema";
import type { CheckInPatch } from "@/lib/check-ins/types";
import { getProfile } from "@/server/profile/queries";

export async function upsertCheckIn(patch: CheckInPatch, userId: string) {
  const person = await getProfile(patch.profileEmail);
  if (!person || person.kind !== "personal") {
    throw new Error("Unknown person");
  }
  const now = new Date();
  const set = {
    ...(patch.checked !== undefined && { checked: patch.checked }),
    ...(patch.flag !== undefined && { flag: patch.flag }),
    ...(patch.note !== undefined && { note: patch.note }),
    updatedBy: userId,
    updatedAt: now,
  };
  await db
    .insert(checkIn)
    .values({
      profileEmail: person.email,
      year: patch.year,
      month: patch.month,
      checked: patch.checked ?? false,
      flag: patch.flag ?? null,
      note: patch.note ?? null,
      updatedBy: userId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [checkIn.profileEmail, checkIn.year, checkIn.month],
      set,
    });
}
