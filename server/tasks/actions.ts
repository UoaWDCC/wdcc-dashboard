"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  task,
  taskAssignee,
  taskLink,
  taskTag,
  tag,
  user,
  profile,
} from "@/lib/db/schema";
import { lockProfileEmails } from "@/lib/db/locks";
import { requireUser } from "@/lib/rbac";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ColumnId =
  | { kind: "backlog" }
  | { kind: "done" }
  | { kind: "user"; profileEmail: string };

export type TaskAssigneeView = {
  profileEmail: string;
  name: string;
  position: number;
};

export type TaskTagView = {
  id: string;
  name: string;
  color: string | null;
};

export type TaskLinkView = {
  id: string;
  url: string;
  title: string | null;
};

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  status: "backlog" | "active" | "done";
  priority: "low" | "med" | "high" | null;
  team:
    | "Admin"
    | "Projects"
    | "Tech"
    | "Marketing"
    | "Industry"
    | "Social"
    | null;
  dueDate: string | null;
  startDate: string | null;
  estimateHours: number | null;
  position: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignees: TaskAssigneeView[];
  tags: TaskTagView[];
  links: TaskLinkView[];
};

const POSITION_GAP_MIN = 1e-6;
const ALLOWED_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const DONE_RETENTION_DAYS = 30;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validateLinkUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid link URL: ${raw}`);
  }
  if (!ALLOWED_LINK_SCHEMES.has(parsed.protocol)) {
    throw new Error(`Unsupported link scheme: ${parsed.protocol}`);
  }
  return parsed.toString();
}

function midpoint(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1;
  if (before === null) return (after as number) - 1;
  if (after === null) return before + 1;
  return (before + after) / 2;
}

const teamEnum = z.enum([
  "Admin",
  "Projects",
  "Tech",
  "Marketing",
  "Industry",
  "Social",
]);
const priorityEnum = z.enum(["low", "med", "high"]);
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const createTaskSchema = z.object({
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
  assigneeEmails: z.array(z.string().trim().email()).optional(),
});

const updateTaskSchema = z.object({
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
  assigneeEmails: z.array(z.string().trim().email()).optional(),
});

async function assertProfilesExist(tx: Tx, emails: string[]): Promise<void> {
  if (!emails.length) return;
  const rows = await tx
    .select({ email: profile.email })
    .from(profile)
    .where(inArray(profile.email, emails));
  const known = new Set(rows.map((r) => r.email));
  const unknown = emails.filter((e) => !known.has(e));
  if (unknown.length) {
    throw new Error(`Unknown assignee email(s): ${unknown.join(", ")}`);
  }
}

const dedupe = <T>(xs: T[] | undefined): T[] =>
  xs ? [...new Set(xs)] : [];

function columnLockKey(col: ColumnId): number {
  const s = col.kind === "user" ? `user:${col.profileEmail}` : col.kind;
  // djb2-ish 32-bit hash; pg_advisory_xact_lock takes int8
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) | 0;
  return h;
}

async function lockColumns(tx: Tx, a: ColumnId, b: ColumnId): Promise<void> {
  const ka = columnLockKey(a);
  const kb = columnLockKey(b);
  const [first, second] = ka <= kb ? [ka, kb] : [kb, ka];
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${first})`);
  if (second !== first) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${second})`);
  }
}

export async function listTasks(): Promise<TaskView[]> {
  await requireUser();

  const doneCutoff = new Date(
    Date.now() - DONE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  );
  const rows = await db
    .select()
    .from(task)
    .where(
      and(
        isNull(task.deletedAt),
        or(
          sql`${task.status} <> 'done'`,
          gte(task.completedAt, doneCutoff)
        )
      )
    )
    .orderBy(asc(task.position));

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [assigneeRows, tagRows, linkRows] = await Promise.all([
    db
      .select({
        taskId: taskAssignee.taskId,
        profileEmail: taskAssignee.profileEmail,
        position: taskAssignee.position,
        name: profile.name,
      })
      .from(taskAssignee)
      .innerJoin(profile, eq(profile.email, taskAssignee.profileEmail))
      .where(inArray(taskAssignee.taskId, ids))
      .orderBy(asc(taskAssignee.position)),
    db
      .select({
        taskId: taskTag.taskId,
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })
      .from(taskTag)
      .innerJoin(tag, eq(tag.id, taskTag.tagId))
      .where(inArray(taskTag.taskId, ids)),
    db
      .select()
      .from(taskLink)
      .where(inArray(taskLink.taskId, ids)),
  ]);

  const assigneesByTask = new Map<string, TaskAssigneeView[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({
      profileEmail: a.profileEmail,
      name: a.name,
      position: a.position,
    });
    assigneesByTask.set(a.taskId, list);
  }
  const tagsByTask = new Map<string, TaskTagView[]>();
  for (const t of tagRows) {
    const list = tagsByTask.get(t.taskId) ?? [];
    list.push({ id: t.id, name: t.name, color: t.color });
    tagsByTask.set(t.taskId, list);
  }
  const linksByTask = new Map<string, TaskLinkView[]>();
  for (const l of linkRows) {
    const list = linksByTask.get(l.taskId) ?? [];
    list.push({ id: l.id, url: l.url, title: l.title });
    linksByTask.set(l.taskId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    team: r.team,
    dueDate: r.dueDate,
    startDate: r.startDate,
    estimateHours: r.estimateHours,
    position: r.position,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    assignees: assigneesByTask.get(r.id) ?? [],
    tags: tagsByTask.get(r.id) ?? [],
    links: linksByTask.get(r.id) ?? [],
  }));
}

export type Team =
  | "Admin"
  | "Projects"
  | "Tech"
  | "Marketing"
  | "Industry"
  | "Social";

export async function listUsers(team?: Team) {
  await requireUser();
  const base = db
    .select({
      email: profile.email,
      name: profile.name,
      image: user.image,
    })
    .from(profile)
    .leftJoin(user, eq(user.email, profile.email));
  if (team) {
    return base
      .where(and(eq(profile.kind, "personal"), eq(profile.team, team)))
      .orderBy(asc(profile.name));
  }
  return base.where(eq(profile.kind, "personal")).orderBy(asc(profile.name));
}

export async function listTags() {
  await requireUser();
  return db
    .select({ id: tag.id, name: tag.name, color: tag.color })
    .from(tag)
    .orderBy(asc(tag.name));
}

export async function createTag(input: { name: string; color?: string }) {
  // TODO: gate to admin role once roles exist
  const session = await requireUser();
  const name = input.name.trim().toLowerCase();
  if (!name) throw new Error("Tag name required");
  if (input.color !== undefined && !HEX_COLOR_RE.test(input.color)) {
    throw new Error("Tag color must be #RRGGBB hex");
  }
  const [created] = await db
    .insert(tag)
    .values({ name, color: input.color, createdBy: session.user.id })
    .onConflictDoNothing({ target: tag.name })
    .returning();
  return created ?? null;
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: "low" | "med" | "high";
  team?:
    | "Admin"
    | "Projects"
    | "Tech"
    | "Marketing"
    | "Industry"
    | "Social";
  dueDate?: string;
  startDate?: string;
  estimateHours?: number;
  tagIds?: string[];
  links?: { url: string; title?: string }[];
  assigneeEmails?: string[];
};

export async function createTask(input: CreateTaskInput) {
  const session = await requireUser();
  const data = createTaskSchema.parse(input);
  const tagIds = dedupe(data.tagIds);
  const assigneeEmails = dedupe(data.assigneeEmails).map((e) =>
    e.trim().toLowerCase()
  );

  const result = await db.transaction(async (tx) => {
    await lockProfileEmails(tx, assigneeEmails);
    await assertProfilesExist(tx, assigneeEmails);
    const status = assigneeEmails.length ? "active" : "backlog";

    const tailRow = await tx
      .select({ max: sql<number>`coalesce(max(${task.position}), 0)` })
      .from(task)
      .where(and(isNull(task.deletedAt), eq(task.status, status)));
    const newPosition = (tailRow[0]?.max ?? 0) + 1;

    const [inserted] = await tx
      .insert(task)
      .values({
        title: data.title,
        description: data.description?.trim() || null,
        status,
        priority: data.priority,
        team: data.team,
        dueDate: data.dueDate,
        startDate: data.startDate,
        estimateHours: data.estimateHours,
        position: newPosition,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    if (tagIds.length) {
      await tx
        .insert(taskTag)
        .values(tagIds.map((tagId) => ({ taskId: inserted.id, tagId })));
    }
    if (data.links?.length) {
      await tx.insert(taskLink).values(
        data.links.map((l) => ({
          taskId: inserted.id,
          url: validateLinkUrl(l.url),
          title: l.title,
        }))
      );
    }
    if (assigneeEmails.length) {
      const maxRows = await tx
        .select({
          profileEmail: taskAssignee.profileEmail,
          max: sql<number>`coalesce(max(${taskAssignee.position}), 0)`,
        })
        .from(taskAssignee)
        .where(inArray(taskAssignee.profileEmail, assigneeEmails))
        .groupBy(taskAssignee.profileEmail);
      const maxByEmail = new Map(
        maxRows.map((r) => [r.profileEmail, Number(r.max)])
      );
      const assigneeValues = assigneeEmails.map((email, i) => ({
        taskId: inserted.id,
        profileEmail: email,
        position: (maxByEmail.get(email) ?? 0) + 1 + i,
        assignedBy: session.user.id,
      }));
      await tx.insert(taskAssignee).values(assigneeValues);
    }

    return inserted;
  });

  revalidatePath("/tasks");
  return result;
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: "low" | "med" | "high" | null;
  team?:
    | "Admin"
    | "Projects"
    | "Tech"
    | "Marketing"
    | "Industry"
    | "Social"
    | null;
  dueDate?: string | null;
  startDate?: string | null;
  estimateHours?: number | null;
  tagIds?: string[];
  links?: { url: string; title?: string | null }[];
  assigneeEmails?: string[];
};

export async function updateTask(id: string, patch: UpdateTaskInput) {
  const session = await requireUser();
  const data = updateTaskSchema.parse(patch);

  await db.transaction(async (tx) => {

    const fields: Partial<typeof task.$inferInsert> = {
      updatedBy: session.user.id,
    };
    if (data.title !== undefined) fields.title = data.title;
    if (data.description !== undefined)
      fields.description = data.description?.trim() || null;
    if (data.priority !== undefined) fields.priority = data.priority;
    if (data.team !== undefined) fields.team = data.team;
    if (data.dueDate !== undefined) fields.dueDate = data.dueDate;
    if (data.startDate !== undefined) fields.startDate = data.startDate;
    if (data.estimateHours !== undefined)
      fields.estimateHours = data.estimateHours;

    await tx.update(task).set(fields).where(eq(task.id, id));

    if (data.tagIds !== undefined) {
      const tagIds = dedupe(data.tagIds);
      await tx.delete(taskTag).where(eq(taskTag.taskId, id));
      if (tagIds.length) {
        await tx
          .insert(taskTag)
          .values(tagIds.map((tagId) => ({ taskId: id, tagId })));
      }
    }

    if (data.links !== undefined) {
      await tx.delete(taskLink).where(eq(taskLink.taskId, id));
      if (data.links.length) {
        await tx.insert(taskLink).values(
          data.links.map((l) => ({
            taskId: id,
            url: validateLinkUrl(l.url),
            title: l.title ?? null,
          }))
        );
      }
    }

    if (data.assigneeEmails !== undefined) {
      const targetList = dedupe(data.assigneeEmails).map((e) =>
        e.trim().toLowerCase()
      );
      await lockProfileEmails(tx, targetList);
      await assertProfilesExist(tx, targetList);
      const existing = await tx
        .select({ profileEmail: taskAssignee.profileEmail })
        .from(taskAssignee)
        .where(eq(taskAssignee.taskId, id));
      const existingEmails = new Set(existing.map((e) => e.profileEmail));
      const targetEmails = new Set(targetList);

      const toRemove = [...existingEmails].filter(
        (u) => !targetEmails.has(u)
      );
      const toAdd = [...targetEmails].filter((u) => !existingEmails.has(u));

      if (toRemove.length) {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, id),
              inArray(taskAssignee.profileEmail, toRemove)
            )
          );
      }
      if (toAdd.length) {
        const maxRows = await tx
          .select({
            profileEmail: taskAssignee.profileEmail,
            max: sql<number>`coalesce(max(${taskAssignee.position}), 0)`,
          })
          .from(taskAssignee)
          .where(inArray(taskAssignee.profileEmail, toAdd))
          .groupBy(taskAssignee.profileEmail);
        const maxByEmail = new Map(
          maxRows.map((r) => [r.profileEmail, Number(r.max)])
        );
        await tx.insert(taskAssignee).values(
          toAdd.map((email) => ({
            taskId: id,
            profileEmail: email,
            position: (maxByEmail.get(email) ?? 0) + 1,
            assignedBy: session.user.id,
          }))
        );
      }

      const finalCount = targetEmails.size;
      const current = await tx
        .select({ status: task.status })
        .from(task)
        .where(eq(task.id, id))
        .limit(1);
      if (current[0]?.status !== "done") {
        await tx
          .update(task)
          .set({ status: finalCount > 0 ? "active" : "backlog" })
          .where(eq(task.id, id));
      }
    }
  });

  revalidatePath("/tasks");
}

export async function softDeleteTask(id: string) {
  const session = await requireUser();
  await db.transaction(async (tx) => {
    await tx.delete(taskAssignee).where(eq(taskAssignee.taskId, id));
    await tx
      .update(task)
      .set({ deletedAt: new Date(), updatedBy: session.user.id })
      .where(eq(task.id, id));
  });
  revalidatePath("/tasks");
}

export type MoveTaskInput = {
  taskId: string;
  to: ColumnId;
  from: ColumnId;
  beforeId: string | null;
  afterId: string | null;
};

export async function moveTask(input: MoveTaskInput) {
  const session = await requireUser();
  const { taskId, to, from, beforeId, afterId } = input;

  await db.transaction(async (tx) => {
    // Lock profile emails touched by this move BEFORE column locks so we
    // serialize against removeProfileAction (which also takes profile locks).
    // Otherwise a concurrent profile delete can cascade-delete an assignee
    // row we just inserted, leaving an active task with zero assignees.
    const profileEmails: string[] = [];
    if (from.kind === "user") profileEmails.push(from.profileEmail);
    if (to.kind === "user") profileEmails.push(to.profileEmail);
    await lockProfileEmails(tx, profileEmails);
    await lockColumns(tx, from, to);

    const current = await tx
      .select()
      .from(task)
      .where(eq(task.id, taskId))
      .limit(1);
    if (!current[0]) throw new Error("Task not found");

    const prevStatus = current[0].status;
    const prevCompletedAt = current[0].completedAt;
    let nextStatus: "backlog" | "active" | "done" = prevStatus;
    let assigneeExists = false;

    if (to.kind === "backlog") {
      if (from.kind === "user") {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, from.profileEmail)
            )
          );
        const remaining = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(taskAssignee)
          .where(eq(taskAssignee.taskId, taskId));
        nextStatus = (remaining[0]?.count ?? 0) === 0 ? "backlog" : "active";
      } else {
        // Backlog invariant: zero assignees. Wipe all when dropping in from
        // non-user columns (e.g. done → backlog) to keep status/assignee in sync.
        await tx.delete(taskAssignee).where(eq(taskAssignee.taskId, taskId));
        nextStatus = "backlog";
      }
    } else if (to.kind === "done") {
      nextStatus = "done";
    } else {
      nextStatus = "active";
      if (from.kind === "user" && from.profileEmail !== to.profileEmail) {
        await tx
          .delete(taskAssignee)
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, from.profileEmail)
            )
          );
      }
      const exists = await tx
        .select({ profileEmail: taskAssignee.profileEmail })
        .from(taskAssignee)
        .where(
          and(
            eq(taskAssignee.taskId, taskId),
            eq(taskAssignee.profileEmail, to.profileEmail)
          )
        )
        .limit(1);
      assigneeExists = !!exists[0];
    }

    const isDone = nextStatus === "done";
    const wasDone = prevStatus === "done";
    const completedAt =
      isDone && !wasDone
        ? new Date()
        : !isDone && wasDone
          ? null
          : prevCompletedAt;

    // Dropped on backlog but other assignees keep the task active: the visual
    // effect is "remove me from this user column". No backlog-relative position
    // computation; do not write task.position (it'd pollute the active task
    // with a backlog midpoint).
    if (to.kind === "backlog" && nextStatus === "active") {
      await tx
        .update(task)
        .set({ status: nextStatus, completedAt, updatedBy: session.user.id })
        .where(eq(task.id, taskId));
      return;
    }

    const beforePos = beforeId
      ? await getNeighborPosition(tx, beforeId, to)
      : null;
    const afterPos = afterId
      ? await getNeighborPosition(tx, afterId, to)
      : null;
    let newPos = midpoint(beforePos, afterPos);

    if (
      beforePos !== null &&
      afterPos !== null &&
      Math.abs(afterPos - beforePos) < POSITION_GAP_MIN
    ) {
      newPos = await rebalanceColumn(tx, to, taskId, beforeId, afterId);
    }

    if (to.kind === "user") {
      if (assigneeExists) {
        await tx
          .update(taskAssignee)
          .set({ position: newPos })
          .where(
            and(
              eq(taskAssignee.taskId, taskId),
              eq(taskAssignee.profileEmail, to.profileEmail)
            )
          );
      } else {
        await tx.insert(taskAssignee).values({
          taskId,
          profileEmail: to.profileEmail,
          position: newPos,
          assignedBy: session.user.id,
        });
      }
      // Clear stale task.position carried from prior backlog/done column.
      // task.position is meaningless for active rows (ordered via taskAssignee).
      await tx
        .update(task)
        .set({
          status: nextStatus,
          position: 0,
          completedAt,
          updatedBy: session.user.id,
        })
        .where(eq(task.id, taskId));
    } else {
      await tx
        .update(task)
        .set({
          position: newPos,
          status: nextStatus,
          completedAt,
          updatedBy: session.user.id,
        })
        .where(eq(task.id, taskId));
    }
  });

  revalidatePath("/tasks");
}

async function getNeighborPosition(
  tx: Tx,
  neighborTaskId: string,
  col: ColumnId
): Promise<number | null> {
  if (col.kind === "user") {
    const r = await tx
      .select({ position: taskAssignee.position })
      .from(taskAssignee)
      .where(
        and(
          eq(taskAssignee.taskId, neighborTaskId),
          eq(taskAssignee.profileEmail, col.profileEmail)
        )
      )
      .for("update")
      .limit(1);
    return r[0]?.position ?? null;
  }
  const r = await tx
    .select({ position: task.position })
    .from(task)
    .where(eq(task.id, neighborTaskId))
    .for("update")
    .limit(1);
  return r[0]?.position ?? null;
}

async function rebalanceColumn(
  tx: Tx,
  col: ColumnId,
  movingTaskId: string,
  beforeId: string | null,
  afterId: string | null
): Promise<number> {
  if (col.kind === "user") {
    const rows = await tx
      .select({ taskId: taskAssignee.taskId, position: taskAssignee.position })
      .from(taskAssignee)
      .where(eq(taskAssignee.profileEmail, col.profileEmail))
      .orderBy(asc(taskAssignee.position));
    return assignSpacedPositions(rows, movingTaskId, beforeId, afterId, async (taskId, position) => {
      await tx
        .update(taskAssignee)
        .set({ position })
        .where(
          and(
            eq(taskAssignee.taskId, taskId),
            eq(taskAssignee.profileEmail, col.profileEmail)
          )
        );
    });
  }
  const targetStatus = col.kind === "done" ? "done" : "backlog";
  const rows = await tx
    .select({ taskId: task.id, position: task.position })
    .from(task)
    .where(and(eq(task.status, targetStatus), isNull(task.deletedAt)))
    .orderBy(asc(task.position));
  return assignSpacedPositions(rows, movingTaskId, beforeId, afterId, async (taskId, position) => {
    await tx.update(task).set({ position }).where(eq(task.id, taskId));
  });
}

async function assignSpacedPositions(
  rows: { taskId: string; position: number }[],
  movingTaskId: string,
  beforeId: string | null,
  afterId: string | null,
  write: (taskId: string, position: number) => Promise<void>
): Promise<number> {
  const filtered = rows.filter((r) => r.taskId !== movingTaskId);
  let insertIdx = filtered.length;
  if (afterId) {
    const i = filtered.findIndex((r) => r.taskId === afterId);
    if (i >= 0) insertIdx = i;
  } else if (beforeId) {
    const i = filtered.findIndex((r) => r.taskId === beforeId);
    if (i >= 0) insertIdx = i + 1;
  }
  const reordered = [
    ...filtered.slice(0, insertIdx),
    { taskId: movingTaskId, position: 0 },
    ...filtered.slice(insertIdx),
  ];
  let movedPos = 0;
  for (let i = 0; i < reordered.length; i++) {
    const newPos = (i + 1) * 1;
    if (reordered[i].taskId === movingTaskId) movedPos = newPos;
    else await write(reordered[i].taskId, newPos);
  }
  return movedPos;
}
