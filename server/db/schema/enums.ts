import "server-only";

import { pgEnum } from "drizzle-orm/pg-core";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TEAMS,
  PROFILE_KINDS,
  CHECK_IN_FLAGS,
} from "@/lib/types";

export const taskStatus = pgEnum("task_status", TASK_STATUSES);
export const taskPriority = pgEnum("task_priority", TASK_PRIORITIES);
export const taskTeam = pgEnum("task_team", TEAMS);
export const profileKind = pgEnum("profile_kind", PROFILE_KINDS);
export const checkInFlag = pgEnum("check_in_flag", CHECK_IN_FLAGS);
