import { pgEnum } from "drizzle-orm/pg-core";

export const taskStatus = pgEnum("task_status", ["backlog", "active", "done"]);
export const taskPriority = pgEnum("task_priority", ["low", "med", "high"]);
export const taskTeam = pgEnum("task_team", [
  "Admin",
  "Projects",
  "Tech",
  "Marketing",
  "Industry",
  "Social",
]);
