import { z } from "zod";
import { TASK_PRIORITIES, TEAMS } from "@/lib/types";

const teamEnum = z.enum(TEAMS);
const priorityEnum = z.enum(TASK_PRIORITIES);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const email = z.email().trim().toLowerCase();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title required"),
  description: z.string().optional(),
  priority: priorityEnum.optional(),
  team: teamEnum.optional(),
  dueDate: dateStr.optional(),
  startDate: dateStr.optional(),
  estimateHours: z.number().int().nonnegative().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  links: z
    .array(z.object({ url: z.string().min(1), title: z.string().optional() }))
    .optional(),
  assigneeEmails: z.array(email).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: priorityEnum.nullable().optional(),
  team: teamEnum.nullable().optional(),
  dueDate: dateStr.nullable().optional(),
  startDate: dateStr.nullable().optional(),
  estimateHours: z.number().int().nonnegative().nullable().optional(),
  tagIds: z.array(z.string().min(1)).optional(),
  links: z
    .array(
      z.object({
        url: z.string().min(1),
        title: z.string().nullish(),
      })
    )
    .optional(),
  assigneeEmails: z.array(email).optional(),
});

const columnIdSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("backlog") }),
  z.object({ kind: z.literal("done") }),
  z.object({ kind: z.literal("user"), profileEmail: email }),
]);

export const moveTaskSchema = z.object({
  taskId: z.string().min(1),
  to: columnIdSchema,
  from: columnIdSchema,
  beforeId: z.string().min(1).nullable(),
  afterId: z.string().min(1).nullable(),
});
