"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/rbac";
import {
  upsertProfile,
  removeProfile,
  type Team,
  type ProfileKind,
} from "@/lib/profile";

const TEAMS: readonly Team[] = [
  "Admin",
  "Projects",
  "Tech",
  "Marketing",
  "Industry",
  "Social",
];

function parseTeam(raw: string | null): Team | null {
  if (!raw) return null;
  return (TEAMS as readonly string[]).includes(raw) ? (raw as Team) : null;
}

function parseKind(raw: string | null): ProfileKind {
  return raw === "shared" ? "shared" : "personal";
}

export async function upsertProfileAction(formData: FormData) {
  const session = await requireUser("/admin");
  const email = (formData.get("email") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  if (!email || !name) return;
  const team = parseTeam(formData.get("team") as string | null);
  const kind = parseKind(formData.get("kind") as string | null);
  const note = (formData.get("note") as string | null)?.trim() || null;
  await upsertProfile({
    email,
    name,
    team,
    kind,
    note,
    createdBy: session.user.id,
  });
  revalidatePath("/admin");
  revalidatePath("/tasks");
}

export async function removeProfileAction(formData: FormData) {
  await requireUser("/admin");
  const email = formData.get("email") as string;
  await removeProfile(email);
  revalidatePath("/admin");
  revalidatePath("/tasks");
}
