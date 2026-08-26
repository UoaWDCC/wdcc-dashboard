import { getBoardVersion, listTasks, listUsers } from "@/server/tasks/queries";
import { listTags } from "@/server/tags/queries";
import TasksBoard from "@/components/tasks/TasksBoard";
import { requireUser } from "@/server/auth/access";
import { getProfile } from "@/server/profile/queries";

export default async function TasksPage() {
  const session = await requireUser("/tasks");
  const [tasks, users, tags, profile, version] = await Promise.all([
    listTasks(),
    listUsers(),
    listTags(),
    getProfile(session.user.email),
    getBoardVersion(),
  ]);

  return (
    <TasksBoard
      initialTasks={tasks}
      initialVersion={version}
      users={users}
      tags={tags}
      defaultTeam={profile?.team ?? null}
    />
  );
}
