import { listUsers, listTags, listTasks } from "@/server/tasks/actions";
import TasksBoard from "@/components/tasks/TasksBoard";
import { requireUser } from "@/lib/access";
import { getProfile } from "@/lib/profile";

export default async function TasksPage() {
	const session = await requireUser("/tasks");
	const [tasks, users, tags, profile] = await Promise.all([
		listTasks(),
		listUsers(),
		listTags(),
		getProfile(session.user.email),
	]);
	
	return (
		<TasksBoard
			initialTasks={tasks}
			users={users}
			tags={tags}
			defaultTeam={profile?.team ?? null}
		/>
	);
}
