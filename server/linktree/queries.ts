import "server-only";

import { asc, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { goLink, goRedirect } from "@/server/db/schema";

// `today` is passed in so a single render orders and groups against the same
// date — computing it here too could straddle midnight and disagree with the
// value handed to the client.
export async function listGoLinks(today: string) {
  // Bind the app's idea of today rather than CURRENT_DATE, which resolves
  // against the database session timezone and would disagree with the client.
  return db
    .select()
    .from(goLink)
    .orderBy(
      // Expired events sink to the bottom
      sql`CASE WHEN ${goLink.eventDate} IS NOT NULL AND ${goLink.eventDate} < ${today}::date THEN 1 ELSE 0 END`,
      asc(goLink.isPermanent),
      asc(goLink.sortOrder)
    );
}

export async function listGoRedirects() {
  return db.select().from(goRedirect).orderBy(asc(goRedirect.key));
}
