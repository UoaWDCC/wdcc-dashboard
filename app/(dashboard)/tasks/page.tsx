import { boardVersionOf, listTasks, listUsers } from "@/server/tasks/queries";
import { listTags } from "@/server/tags/queries";
import TasksView from "@/components/tasks/TasksView";
import { requireUser } from "@/server/auth/access";
import { getProfile } from "@/server/profile/queries";
import { cookies } from "next/headers";
import { VIEW_COOKIE, isViewMode } from "@/lib/tasks/view";

export default async function TasksPage() {
  const session = await requireUser("/tasks");
  const [tasks, users, tags, profile, cookieStore] = await Promise.all([
    listTasks(),
    listUsers(),
    listTags(),
    getProfile(session.user.email),
    cookies(),
  ]);

  const saved = cookieStore.get(VIEW_COOKIE)?.value;

  return (
    <TasksView
      initialTasks={tasks}
      initialVersion={boardVersionOf(tasks)}
      users={users}
      tags={tags}
      defaultTeam={profile?.team ?? null}
      defaultView={isViewMode(saved) ? saved : "list"}
    />
  );
}
