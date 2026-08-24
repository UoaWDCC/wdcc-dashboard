import "server-only";

import type { goLink } from "@/server/db/schema";

export type GoLinkRow = typeof goLink.$inferSelect;

export type AddGoLinkInput = {
  label: string;
  link: string;
  hoverHint?: string | null;
  iconUrl?: string | null;
  team?: string | null;
  isPermanent?: boolean;
  eventDate?: string | null;
};
