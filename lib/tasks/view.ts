import type { TaskStatus } from "@/lib/types";

export type ViewMode = "list" | "board";
export type TaskListScope = TaskStatus | "all";

export const VIEW_COOKIE = "tasks_view";
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_TASK_LIST_SCOPE = "active";

export function isViewMode(value: string | undefined): value is ViewMode {
  return value === "list" || value === "board";
}

export function isTaskListScope(
  value: string | undefined
): value is TaskListScope {
  return (
    value === "active" ||
    value === "backlog" ||
    value === "done" ||
    value === "all"
  );
}
