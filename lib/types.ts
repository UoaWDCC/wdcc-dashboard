export const TASK_STATUSES = ["backlog", "active", "done"] as const;
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
