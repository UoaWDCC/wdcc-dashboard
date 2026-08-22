"use server";

import { requireUser } from "@/lib/access";
import { getTodayIso } from "@/lib/date";
import { type HomeSummary } from "@/lib/home/summary";
import { buildHomeSummary } from "@/server/home/utils";
import { getProfile } from "@/lib/profile";
import { listTasks } from "@/server/tasks/actions";

export async function getHomeSummary(): Promise<HomeSummary> {
  const session = await requireUser("/");
  const [tasks, profile] = await Promise.all([
    listTasks(),
    getProfile(session.user.email),
  ]);
  return buildHomeSummary(
    tasks,
    session.user.email,
    getTodayIso(),
    profile?.team ?? null
  );
}
