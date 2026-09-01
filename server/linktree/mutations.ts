import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { goLink, goRedirect } from "@/server/db/schema";
import { getTodayIso } from "@/lib/date";

// Expired links auto-hide: flip hidden on any that have passed their eventDate.
// Kept out of listGoLinks so reads stay free of write side-effects — call this
// from an explicit mutation path (see app/(dashboard)/linktree/page.tsx).
export async function hideExpiredGoLinks() {
  const today = getTodayIso();
  const rows = await db
    .update(goLink)
    .set({ hidden: true, updatedAt: new Date() })
    .where(
      sql`${goLink.eventDate} IS NOT NULL AND ${goLink.eventDate} < ${today}::date AND ${goLink.hidden} = false`
    )
    .returning({ id: goLink.id });
  return rows.length;
}

export async function addGoLink(
  data: {
    label: string;
    link: string;
    hoverHint?: string | null;
    iconUrl?: string | null;
    isPermanent?: boolean;
    hidden?: boolean;
    team?: string | null;
    eventDate?: string | null;
  },
  userId: string
) {
  // Insert at the next available sortOrder so the new link appears at the end
  // of the current ordering. The read query orders by the expiry group first,
  // then by sortOrder, so the new row lands at the bottom of whichever group
  // it belongs to.
  return db.transaction(async (tx) => {
    const [maxRow] = await tx
      .select({ maxSortOrder: sql<number>`max(${goLink.sortOrder})` })
      .from(goLink);

    const nextSortOrder = (maxRow?.maxSortOrder ?? -1) + 1;

    const [row] = await tx
      .insert(goLink)
      .values({
        label: data.label,
        link: data.link,
        hoverHint: data.hoverHint ?? null,
        iconUrl: data.iconUrl ?? null,
        isPermanent: data.isPermanent ?? false,
        hidden: data.hidden ?? false,
        sortOrder: nextSortOrder,
        team: data.team ?? null,
        eventDate: data.eventDate ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return row;
  });
}

export async function updateGoLink(
  id: string,
  data: {
    label?: string;
    link?: string;
    hoverHint?: string | null;
    iconUrl?: string | null;
    isPermanent?: boolean;
    hidden?: boolean;
    sortOrder?: number;
    team?: string | null;
    eventDate?: string | null;
  },
  userId: string
) {
  await db
    .update(goLink)
    .set({ ...data, updatedBy: userId, updatedAt: new Date() })
    .where(eq(goLink.id, id));
}

export async function removeGoLink(id: string) {
  await db.delete(goLink).where(eq(goLink.id, id));
}

export async function toggleGoLinkHidden(
  id: string,
  hidden: boolean,
  userId: string
) {
  await db
    .update(goLink)
    .set({ hidden, updatedBy: userId, updatedAt: new Date() })
    .where(eq(goLink.id, id));
}

export async function reorderGoLinks(orderedIds: string[], userId: string) {
  if (orderedIds.length === 0) return;
  const now = new Date();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(goLink)
        .set({ sortOrder: i, updatedBy: userId, updatedAt: now })
        .where(eq(goLink.id, orderedIds[i]));
    }
  });
}

export async function addGoRedirect(
  key: string,
  destinationUrl: string,
  userId: string
) {
  await db.insert(goRedirect).values({
    key,
    destinationUrl,
    createdBy: userId,
    updatedBy: userId,
  });
}

export async function updateGoRedirect(
  key: string,
  data: { destinationUrl?: string; hidden?: boolean },
  userId: string
) {
  await db
    .update(goRedirect)
    .set({ ...data, updatedBy: userId, updatedAt: new Date() })
    .where(eq(goRedirect.key, key));
}

export async function removeGoRedirect(key: string) {
  await db.delete(goRedirect).where(eq(goRedirect.key, key));
}
