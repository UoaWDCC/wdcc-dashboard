export const TASK_STATUSES = ["backlog", "active", "done"] as const;
// Order is load-bearing: the pg enum is generated from this array, so Postgres
// enum ordering is declaration order. Ascending urgency — insert new values in
// the right slot or `ORDER BY priority DESC` silently breaks.
export const TASK_PRIORITIES = ["low", "med", "high"] as const;
export const TEAMS = [
  "Admin",
  "Projects",
  "Tech",
  "Marketing",
  "Industry",
  "Social",
] as const;
export const PROFILE_KINDS = ["personal", "shared"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type Team = (typeof TEAMS)[number];
export type ProfileKind = (typeof PROFILE_KINDS)[number];

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "bg-emerald-500",
  med: "bg-amber-500",
  high: "bg-red-500",
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low priority",
  med: "Medium priority",
  high: "High priority",
};
