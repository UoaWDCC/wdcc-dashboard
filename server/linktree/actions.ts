"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/access";
import {
  addGoLink,
  updateGoLink,
  removeGoLink,
  toggleGoLinkHidden,
  reorderGoLinks,
  addGoRedirect,
  removeGoRedirect,
  updateGoRedirect,
} from "@/lib/linktree";
import type { AddGoLinkInput, GoLinkRow } from "./types";
import {
  parseString,
  parseRequiredString,
  parseBool,
} from "@/lib/form-parser";

export async function addGoLinkAction(
  input: AddGoLinkInput
): Promise<GoLinkRow> {
  const session = await requireUser("/linktree");
  const label = input.label.trim();
  const link = input.link.trim();
  if (!label || !link) throw new Error("label and link required");
  const row = await addGoLink(
    {
      label,
      link,
      hoverHint: input.hoverHint?.trim() || null,
      iconUrl: input.iconUrl?.trim() || null,
      team: input.team?.trim() || null,
      isPermanent: input.isPermanent ?? false,
      eventDate: input.eventDate?.trim() || null,
    },
    session.user.id
  );
  revalidatePath("/linktree");
  return row;
}

export async function updateGoLinkAction(id: string, input: AddGoLinkInput) {
  const session = await requireUser("/linktree");
  const label = input.label.trim();
  const link = input.link.trim();
  if (!label || !link) throw new Error("label and link required");
  await updateGoLink(
    id,
    {
      label,
      link,
      hoverHint: input.hoverHint?.trim() || null,
      iconUrl: input.iconUrl?.trim() || null,
      team: input.team?.trim() || null,
      isPermanent: input.isPermanent ?? false,
      eventDate: input.eventDate?.trim() || null,
    },
    session.user.id
  );
  revalidatePath("/linktree");
}

export async function removeGoLinkAction(id: string) {
  await requireUser("/linktree");
  await removeGoLink(id);
  revalidatePath("/linktree");
}

export async function toggleGoLinkHiddenAction(id: string, hidden: boolean) {
  const session = await requireUser("/linktree");
  await toggleGoLinkHidden(id, hidden, session.user.id);
  revalidatePath("/linktree");
}

export async function reorderGoLinksAction(orderedIds: string[]) {
  const session = await requireUser("/linktree");
  await reorderGoLinks(orderedIds, session.user.id);
  revalidatePath("/linktree");
}

export async function addGoRedirectAction(formData: FormData) {
  const session = await requireUser("/linktree");
  const key = parseString(formData, "key");
  const destinationUrl = parseString(formData, "destinationUrl");
  if (!key || !destinationUrl)
    throw new Error("key and destinationUrl required");
  await addGoRedirect(key, destinationUrl, session.user.id);
  revalidatePath("/linktree");
}

export async function removeGoRedirectAction(formData: FormData) {
  await requireUser("/linktree");
  await removeGoRedirect(parseRequiredString(formData, "key"));
  revalidatePath("/linktree");
}

export async function toggleGoRedirectHiddenAction(formData: FormData) {
  const session = await requireUser("/linktree");
  const key = parseRequiredString(formData, "key");
  const hidden = parseBool(formData, "hidden");
  await updateGoRedirect(key, { hidden }, session.user.id);
  revalidatePath("/linktree");
}
