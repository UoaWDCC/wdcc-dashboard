import { pgEnum } from "drizzle-orm/pg-core";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TEAMS,
  PROFILE_KINDS,
} from "@/lib/types";

export const taskStatus = pgEnum("task_status", TASK_STATUSES);
export const taskPriority = pgEnum("task_priority", TASK_PRIORITIES);
export const taskTeam = pgEnum("task_team", TEAMS);
export const profileKind = pgEnum("profile_kind", PROFILE_KINDS);
