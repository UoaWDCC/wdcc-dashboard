import { listUsers, listTags, listTasks } from "@/server/tasks/actions";
import TasksBoard from "./tasks-board";

export default async function TasksPage() {
	const [tasks, users, tags] = await Promise.all([
		listTasks(),
		listUsers(),
		listTags(),
	]);
	return <TasksBoard initialTasks={tasks} users={users} tags={tags} />;
}
