import type { ColumnId, TaskView } from "@/server/tasks/actions";
import type { ClientTask } from "./types";

export const userColId = (email: string) => `user-${email}`;

export const userFromCol = (colId: string) =>
	colId.startsWith("user-") ? colId.slice("user-".length) : null;

export function colIdToColumnId(colId: string): ColumnId {
	if (colId === "backlog") return { kind: "backlog" };
	if (colId === "done") return { kind: "done" };
	const profileEmail = userFromCol(colId);
	if (profileEmail) return { kind: "user", profileEmail };
	throw new Error(`Unknown column id: ${colId}`);
}

export const sortableId = (colId: string, taskId: string) =>
	`${colId}::${taskId}`;

export function fromServer(tasks: TaskView[]): ClientTask[] {
	return tasks.map((t) => ({
		id: t.id,
		title: t.title,
		description: t.description,
		status: t.status,
		priority: t.priority,
		team: t.team,
		tags: t.tags.map((tg) => tg.name),
		links: t.links.map((l) => ({ id: l.id, url: l.url, title: l.title })),
		assignees: t.assignees
			.map((a) => ({ profileEmail: a.profileEmail, position: a.position }))
			.sort((a, b) => a.position - b.position),
		position: t.position,
		dueDate: t.dueDate,
	}));
}

export function belongsTo(task: ClientTask, colId: string): boolean {
	if (colId === "backlog") return task.status === "backlog";
	if (colId === "done") return task.status === "done";
	const email = userFromCol(colId);
	if (email)
		return (
			task.status === "active" &&
			task.assignees.some((a) => a.profileEmail === email)
		);
	return false;
}

export function colTasks(tasks: ClientTask[], colId: string): ClientTask[] {
	const list = tasks.filter((t) => belongsTo(t, colId));
	const email = userFromCol(colId);
	if (email) {
		return list.sort((a, b) => {
			const ap = a.assignees.find((x) => x.profileEmail === email)?.position ?? 0;
			const bp = b.assignees.find((x) => x.profileEmail === email)?.position ?? 0;
			return ap - bp;
		});
	}
	return list.sort((a, b) => a.position - b.position);
}

export function positionFor(task: ClientTask, colId: string): number {
	if (colId === "backlog" || colId === "done") return task.position;
	const m = userFromCol(colId);
	if (!m) return 0;
	return task.assignees.find((a) => a.profileEmail === m)?.position ?? 0;
}

export function neighborsOf(
	tasks: ClientTask[],
	movedId: string,
	colId: string,
): { beforeId: string | null; afterId: string | null } {
	const ordered = tasks
		.filter((t) => belongsTo(t, colId))
		.sort((a, b) => positionFor(a, colId) - positionFor(b, colId));
	const idx = ordered.findIndex((t) => t.id === movedId);
	if (idx < 0) return { beforeId: null, afterId: null };
	return {
		beforeId: idx > 0 ? ordered[idx - 1].id : null,
		afterId: idx < ordered.length - 1 ? ordered[idx + 1].id : null,
	};
}

export function applyDragLocal(
	tasks: ClientTask[],
	taskId: string,
	fromCol: string,
	toCol: string,
	overTaskId: string | null,
): ClientTask[] {
	const t = tasks.find((x) => x.id === taskId);
	if (!t) return tasks;

	let status = t.status;
	let assignees = [...t.assignees];
	const oldEmail = userFromCol(fromCol);
	const newEmail = userFromCol(toCol);

	if (toCol === "backlog") {
		if (oldEmail) {
			assignees = assignees.filter((a) => a.profileEmail !== oldEmail);
			if (assignees.length === 0) status = "backlog";
		} else {
			status = "backlog";
			assignees = [];
		}
	} else if (toCol === "done") {
		status = "done";
	} else if (newEmail) {
		status = "active";
		if (oldEmail && oldEmail !== newEmail) {
			assignees = assignees.filter((a) => a.profileEmail !== oldEmail);
		}
		if (!assignees.some((a) => a.profileEmail === newEmail)) {
			assignees.push({ profileEmail: newEmail, position: 0 });
		}
	}

	const mutated = tasks.map((x) =>
		x.id === taskId ? { ...x, status, assignees } : x,
	);
	const moved = mutated.find((x) => x.id === taskId)!;
	const taskBelongsToDest = belongsTo(moved, toCol);

	const destOrdered = mutated
		.filter((x) => x.id !== taskId && belongsTo(x, toCol))
		.sort((a, b) => positionFor(a, toCol) - positionFor(b, toCol));
	let insertIdx = destOrdered.length;
	if (overTaskId && overTaskId !== taskId) {
		const idx = destOrdered.findIndex((x) => x.id === overTaskId);
		if (idx >= 0) insertIdx = idx;
	}
	if (taskBelongsToDest) destOrdered.splice(insertIdx, 0, moved);

	return mutated.map((x) => {
		if (!belongsTo(x, toCol)) return x;
		const i = destOrdered.findIndex((y) => y.id === x.id);
		if (i < 0) return x;
		const newPos = i + 1;
		if (toCol === "backlog" || toCol === "done") {
			return { ...x, position: newPos };
		}
		const assigneeEmail = userFromCol(toCol)!;
		return {
			...x,
			assignees: x.assignees.map((a) =>
				a.profileEmail === assigneeEmail ? { ...a, position: newPos } : a,
			),
		};
	});
}
