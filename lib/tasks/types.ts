import type { TaskPriority, TaskStatus, Team } from "@/lib/types";

export type BoardUser = { email: string; name: string; image: string | null };

export type TagOption = { id: string; name: string; color: string | null };

export type ClientAssignee = { profileEmail: string; position: number };

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
