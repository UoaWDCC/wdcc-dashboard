"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/rbac";
import {
  addGoLink,
  removeGoLink,
  toggleGoLinkHidden,
  addGoRedirect,
  removeGoRedirect,
  updateGoRedirect,
} from "@/lib/linktree";

export async function addGoLinkAction(formData: FormData) {
  const session = await requireUser("/linktree");
  const label = (formData.get("label") as string | null)?.trim();
  const link = (formData.get("link") as string | null)?.trim();
  if (!label || !link) return;
  const hoverHint = (formData.get("hoverHint") as string | null)?.trim() || null;
  const iconUrl = (formData.get("iconUrl") as string | null)?.trim() || null;
  const team = (formData.get("team") as string | null)?.trim() || null;
  const isPermanent = formData.get("isPermanent") === "on";
  const sortOrder =
    parseInt((formData.get("sortOrder") as string | null) ?? "0", 10) || 0;
  await addGoLink(
    { label, link, hoverHint, iconUrl, team, isPermanent, sortOrder },
    session.user.id
  );
  revalidatePath("/linktree");
}

export async function removeGoLinkAction(formData: FormData) {
  await requireUser("/linktree");
  const id = formData.get("id") as string;
  await removeGoLink(id);
  revalidatePath("/linktree");
}

export async function toggleGoLinkHiddenAction(formData: FormData) {
  const session = await requireUser("/linktree");
  const id = formData.get("id") as string;
  const hidden = formData.get("hidden") === "true";
  await toggleGoLinkHidden(id, hidden, session.user.id);
  revalidatePath("/linktree");
}

export async function addGoRedirectAction(formData: FormData) {
  const session = await requireUser("/linktree");
  const key = (formData.get("key") as string | null)?.trim();
  const destinationUrl = (formData.get("destinationUrl") as string | null)?.trim();
  if (!key || !destinationUrl) return;
  await addGoRedirect(key, destinationUrl, session.user.id);
  revalidatePath("/linktree");
}

export async function removeGoRedirectAction(formData: FormData) {
  await requireUser("/linktree");
  const key = formData.get("key") as string;
  await removeGoRedirect(key);
  revalidatePath("/linktree");
}

export async function toggleGoRedirectHiddenAction(formData: FormData) {
  const session = await requireUser("/linktree");
  const key = formData.get("key") as string;
  const hidden = formData.get("hidden") === "true";
  await updateGoRedirect(key, { hidden }, session.user.id);
  revalidatePath("/linktree");
}
