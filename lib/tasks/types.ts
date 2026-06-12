import type { TaskPriority, TaskStatus, Team } from "@/lib/types";

export type ColumnId =
	| { kind: "backlog" }
	| { kind: "done" }
	| { kind: "user"; profileEmail: string };

export type TaskAssigneeView = {
	profileEmail: string;
	name: string;
	position: number;
};

export type TaskTagView = {
	id: string;
	name: string;
	color: string | null;
};

export type TaskLinkView = {
	id: string;
	url: string;
	title: string | null;
};

export type TaskView = {
	id: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority | null;
	team: Team | null;
	dueDate: string | null;
	startDate: string | null;
	estimateHours: number | null;
	position: number;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	assignees: TaskAssigneeView[];
	tags: TaskTagView[];
	links: TaskLinkView[];
};

export type CreateTaskInput = {
	title: string;
	description?: string;
	priority?: TaskPriority;
	team?: Team;
	dueDate?: string;
	startDate?: string;
	estimateHours?: number;
	tagIds?: string[];
	links?: { url: string; title?: string }[];
	assigneeEmails?: string[];
};

export type UpdateTaskInput = {
	title?: string;
	description?: string | null;
	priority?: TaskPriority | null;
	team?: Team | null;
	dueDate?: string | null;
	startDate?: string | null;
	estimateHours?: number | null;
	tagIds?: string[];
	links?: { url: string; title?: string | null }[];
	assigneeEmails?: string[];
};

export type MoveTaskInput = {
	taskId: string;
	to: ColumnId;
	from: ColumnId;
	beforeId: string | null;
	afterId: string | null;
};

export type BoardUser = { email: string; name: string; image: string | null };

export type TagOption = { id: string; name: string; color: string | null };

export type ClientAssignee = { profileEmail: string; position: number };

export type ClientMoveTask = {
	taskId: string;
	fromCol: string;
	toCol: string;
	overTaskId: string | null;
};

export type ClientTask = {
	id: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority | null;
	team: Team | null;
	tags: string[];
	links: { id?: string; url: string; title: string | null }[];
	assignees: ClientAssignee[];
	position: number;
	dueDate: string | null;
};

export type ColumnMeta = {
	id: string;
	label: string;
	accent: "neutral" | "blue" | "orange" | "green";
};
