import "server-only";

import { and, asc, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  task,
  taskAssignee,
  taskLink,
  taskTag,
  tag,
  user,
  profile,
} from "@/server/db/schema";
import type { Team } from "@/lib/types";
import type { TagView } from "@/lib/tags/types";
import type {
  BoardUser,
  TaskAssigneeView,
  TaskLinkView,
  TaskView,
} from "@/lib/tasks/types";

const DONE_RETENTION_DAYS = 30;

const doneCutoff = () =>
  new Date(Date.now() - DONE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

// Shared by both readers so the visible-set predicate cannot drift.
const visibleTasksWhere = (cutoff: Date) =>
  and(
    isNull(task.deletedAt),
    or(sql`${task.status} <> 'done'`, gte(task.completedAt, cutoff))
  );

export async function listTasks(): Promise<TaskView[]> {
  const rows = await db
    .select()
    .from(task)
    .where(visibleTasksWhere(doneCutoff()))
    .orderBy(
      sql`${task.priority} desc nulls last`,
      sql`${task.dueDate} asc nulls last`,
      desc(task.number)
    );

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [assigneeRows, tagRows, linkRows] = await Promise.all([
    db
      .select({
        taskId: taskAssignee.taskId,
        profileEmail: taskAssignee.profileEmail,
        name: profile.name,
      })
      .from(taskAssignee)
      .innerJoin(profile, eq(profile.email, taskAssignee.profileEmail))
      .where(inArray(taskAssignee.taskId, ids)),
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
    db.select().from(taskLink).where(inArray(taskLink.taskId, ids)),
  ]);

  const assigneesByTask = new Map<string, TaskAssigneeView[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push({ profileEmail: a.profileEmail, name: a.name });
    assigneesByTask.set(a.taskId, list);
  }
  const tagsByTask = new Map<string, TagView[]>();
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
    number: r.number,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    team: r.team,
    dueDate: r.dueDate,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    assignees: assigneesByTask.get(r.id) ?? [],
    tags: tagsByTask.get(r.id) ?? [],
    links: linksByTask.get(r.id) ?? [],
  }));
}

// Shared profiles are role accounts: they sign in but get no board column.
export async function listUsers(team?: Team): Promise<BoardUser[]> {
  const base = db
    .select({
      email: profile.email,
      name: profile.name,
      image: user.image,
      team: profile.team,
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

// Derived from an already-fetched visible set, so count and max can never
// describe a different snapshot than the tasks handed out beside them.
export function boardVersionOf(tasks: TaskView[]): string {
  let max = 0;
  for (const t of tasks) {
    const ms = t.updatedAt.getTime();
    if (ms > max) max = ms;
  }
  return `${tasks.length}:${max}`;
}

// Cheap change signature for the board poll. Compare with equality, never `>`:
// a soft delete or done-retention fall-off can move `max` backwards.
export async function getBoardVersion(): Promise<string> {
  // Built in SQL, not from a mapped Date: `updated_at` is `timestamp` without a
  // zone, and a raw `sql` expression skips drizzle's column mapper, so the
  // driver's naive string would parse as local time here and as UTC in
  // boardVersionOf — a constant offset apart, and the probe would never match.
  // floor() matches Date.getTime()'s truncation of sub-millisecond digits.
  const [row] = await db
    .select({
      version: sql<string>`count(*)::text || ':' || coalesce(floor(extract(epoch from max(${task.updatedAt})) * 1000), 0)::bigint::text`,
    })
    .from(task)
    .where(visibleTasksWhere(doneCutoff()));
  return row?.version ?? "0:0";
}
