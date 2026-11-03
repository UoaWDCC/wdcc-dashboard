"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireAdmin } from "@/server/auth/access";
import { getCheckInSheet } from "@/server/check-ins/queries";
import { upsertCheckIn } from "@/server/check-ins/mutations";
import { checkInPatchSchema, checkInYearSchema } from "@/lib/check-ins/schemas";
import type { CheckInSheet } from "@/lib/check-ins/types";

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  raw: unknown,
  fallback: string
): z.output<T> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? fallback);
  }
  return parsed.data;
}

export async function getCheckInSheetAction(
  raw: unknown
): Promise<CheckInSheet> {
  await requireAdmin("/check-ins");
  const year = parseOrThrow(checkInYearSchema, raw, "Invalid year");
  return getCheckInSheet(year);
}

export async function updateCheckInAction(raw: unknown) {
  const session = await requireAdmin("/check-ins");
  const patch = parseOrThrow(checkInPatchSchema, raw, "Invalid check-in");
  await upsertCheckIn(patch, session.user.id);
  revalidatePath("/check-ins");
}
