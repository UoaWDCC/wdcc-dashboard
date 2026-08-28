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

export const TEAM_BADGE: Record<Team, string> = {
  Admin:
    "border-transparent bg-slate-500/15 text-slate-700 dark:text-slate-300",
  Projects:
    "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
  Tech: "border-transparent bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  Marketing:
    "border-transparent bg-pink-500/15 text-pink-700 dark:text-pink-300",
  Industry:
    "border-transparent bg-orange-500/15 text-orange-700 dark:text-orange-300",
  Social:
    "border-transparent bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
};

export const STATUS_BADGE: Record<TaskStatus, string> = {
  backlog: "border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-300",
  active:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  done: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export const STATUS_TEXT: Record<TaskStatus, string> = {
  backlog: "text-blue-600 dark:text-blue-400",
  active: "text-amber-600 dark:text-amber-400",
  done: "text-emerald-600 dark:text-emerald-400",
};
