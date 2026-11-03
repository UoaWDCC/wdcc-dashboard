import "server-only";

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { checkIn, profile } from "@/server/db/schema";
import type {
  CheckInCell,
  CheckInMonth,
  CheckInSheet,
} from "@/lib/check-ins/types";

export async function getCheckInSheet(year: number): Promise<CheckInSheet> {
  const [people, rows] = await Promise.all([
    db
      .select({ email: profile.email, name: profile.name, team: profile.team })
      .from(profile)
      .where(eq(profile.kind, "personal"))
      .orderBy(asc(profile.name), asc(profile.email)),
    db
      .select({
        profileEmail: checkIn.profileEmail,
        month: checkIn.month,
        checked: checkIn.checked,
        flag: checkIn.flag,
        note: checkIn.note,
      })
      .from(checkIn)
      .where(eq(checkIn.year, year)),
  ]);
  const emails = new Set(people.map((p) => p.email));
  const cells: CheckInCell[] = rows
    .filter((r) => emails.has(r.profileEmail))
    .map((r) => ({ ...r, month: r.month as CheckInMonth }));
  return { year, people, cells };
}

export async function listCheckInYears(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ year: checkIn.year })
    .from(checkIn)
    .orderBy(sql`${checkIn.year} desc`);
  return rows.map((r) => r.year);
}
