import type { TaskPriority, TaskStatus, Team } from "@/lib/types";
import type { TagView } from "@/lib/tags/types";

export type ColumnId =
  | { kind: "backlog" }
  | { kind: "done" }
  | { kind: "user"; profileEmail: string };

export type TaskAssigneeView = {
  profileEmail: string;
  name: string;
};

export type TaskLinkView = {
  id: string;
  url: string;
  title: string | null;
};

export type TaskView = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  team: Team | null;
  dueDate: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignees: TaskAssigneeView[];
  tags: TagView[];
  links: TaskLinkView[];
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  team?: Team;
  dueDate?: string;
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
  tagIds?: string[];
  links?: { url: string; title?: string | null }[];
  assigneeEmails?: string[];
};

export type MoveTaskInput = {
  taskId: string;
  to: ColumnId;
  from: ColumnId;
};

export type BoardData = {
  tasks: TaskView[];
  users: BoardUser[];
  tags: TagView[];
};

export type BoardUser = {
  email: string;
  name: string;
  image: string | null;
  team: Team | null;
};

export type ClientAssignee = { profileEmail: string };

export type ClientMoveTask = {
  taskId: string;
  fromCol: string;
  toCol: string;
};

export type ClientTask = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  team: Team | null;
  tags: string[];
  links: { id?: string; url: string; title: string | null }[];
  assignees: ClientAssignee[];
  dueDate: string | null;
  completedAt: string | null;
};

export type ColumnMeta = {
  id: string;
  label: string;
  accent: "neutral" | "blue" | "orange" | "green";
};
