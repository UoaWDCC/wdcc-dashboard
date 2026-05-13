import { listMembers, listTags, listTasks } from "@/server/tasks/actions";
import TasksBoard from "./tasks-board";

export default async function TasksPage() {
	const [tasks, members, tags] = await Promise.all([
		listTasks(),
		listMembers(),
		listTags(),
	]);
	return <TasksBoard initialTasks={tasks} members={members} tags={tags} />;
}
