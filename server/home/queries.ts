import "server-only";

import { requireUser } from "@/server/auth/access";
import { getTodayIso } from "@/lib/date";
import { type HomeSummary } from "@/lib/home/types";
import { buildHomeSummary } from "@/lib/home/summary";
import { getProfile } from "@/server/profile/queries";
import { listTasks } from "@/server/tasks/queries";

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
