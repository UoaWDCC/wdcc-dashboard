"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/rbac";
import {
  addAllowedEmail,
  removeAllowedEmail,
  addAllowedDomain,
  removeAllowedDomain,
} from "@/lib/allowlist";

export async function addEmailAction(formData: FormData) {
  const session = await requireUser("/admin");
  const email = (formData.get("email") as string | null)?.trim();
  if (!email) return;
  const note = (formData.get("note") as string | null)?.trim() || undefined;
  await addAllowedEmail(email, { note, createdBy: session.user.id });
  revalidatePath("/admin");
}

export async function removeEmailAction(formData: FormData) {
  await requireUser("/admin");
  const email = formData.get("email") as string;
  await removeAllowedEmail(email);
  revalidatePath("/admin");
}

export async function addDomainAction(formData: FormData) {
  const session = await requireUser("/admin");
  const domain = (formData.get("domain") as string | null)?.trim();
  if (!domain) return;
  const note = (formData.get("note") as string | null)?.trim() || undefined;
  await addAllowedDomain(domain, { note, createdBy: session.user.id });
  revalidatePath("/admin");
}

export async function removeDomainAction(formData: FormData) {
  await requireUser("/admin");
  const domain = formData.get("domain") as string;
  await removeAllowedDomain(domain);
  revalidatePath("/admin");
}
