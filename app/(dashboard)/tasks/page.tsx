import { boardVersionOf, listTasks, listUsers } from "@/server/tasks/queries";
import { listTags } from "@/server/tags/queries";
import TasksView from "@/components/tasks/TasksView";
import { requireUser } from "@/server/auth/access";
import { getProfile } from "@/server/profile/queries";
import { cookies } from "next/headers";
import { VIEW_COOKIE, isViewMode } from "@/lib/tasks/view";
import { parseFilters } from "@/lib/tasks/utils";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser("/tasks");
  const [tasks, users, tags, profile, cookieStore, params] = await Promise.all([
    listTasks(),
    listUsers(),
    listTags(),
    getProfile(session.user.email),
    cookies(),
    searchParams,
  ]);

  const saved = cookieStore.get(VIEW_COOKIE)?.value;

  return (
    <TasksView
      initialTasks={tasks}
      initialVersion={boardVersionOf(tasks)}
      users={users}
      tags={tags}
      defaultFilters={parseFilters(params, profile?.team ?? null)}
      defaultView={isViewMode(saved) ? saved : "list"}
    />
  );
}
