import {
  pgTable,
  text,
  integer,
  doublePrecision,
  timestamp,
  date,
  index,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { profile } from "./profile";
import { taskStatus, taskPriority, taskTeam } from "./enums";

export { taskStatus, taskPriority, taskTeam };

export const task = pgTable(
  "task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("backlog"),
    priority: taskPriority("priority"),
    team: taskTeam("team"),
    dueDate: date("due_date"),
    startDate: date("start_date"),
    estimateHours: integer("estimate_hours"),
    position: doublePrecision("position").notNull().default(0),
    completedAt: timestamp("completed_at"),
    deletedAt: timestamp("deleted_at"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("task_status_deleted_idx").on(t.status, t.deletedAt),
    index("task_team_idx").on(t.team),
    index("task_due_date_idx").on(t.dueDate),
  ]
);

export const taskAssignee = pgTable(
  "task_assignee",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    profileEmail: text("profile_email")
      .notNull()
      .references(() => profile.email, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    position: doublePrecision("position").notNull().default(0),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedBy: text("assigned_by").references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.profileEmail] }),
    index("task_assignee_profile_pos_idx").on(t.profileEmail, t.position),
  ]
);

export const tag = pgTable(
  "tag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(),
    color: text("color"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [check("tag_name_lower", sql`${t.name} = lower(${t.name})`)]
);

export const taskTag = pgTable(
  "task_tag",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.tagId] }),
    index("task_tag_tag_idx").on(t.tagId),
  ]
);

export const taskLink = pgTable(
  "task_link",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("task_link_task_idx").on(t.taskId)]
);
