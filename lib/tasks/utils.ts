import {
  TASK_PRIORITIES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";
import type { BoardUser, ClientTask, ColumnId, TaskView } from "./types";

// Board sort key: priority band, then due date, then task number.
type SortableTask = Pick<ClientTask, "priority" | "dueDate" | "number">;

const priorityRank = (p: TaskPriority | null): number => {
  return p ? TASK_PRIORITIES.indexOf(p) : -1;
};

export const usersById = (users: BoardUser[]) =>
  new Map(users.map((m) => [m.email, m]));

export const userColId = (email: string) => `user-${email}`;

export const userFromCol = (colId: string) =>
  colId.startsWith("user-") ? colId.slice("user-".length) : null;

export function colIdToColumnId(colId: string): ColumnId {
  if (colId === "backlog") return { kind: "backlog" };
  if (colId === "done") return { kind: "done" };
  const profileEmail = userFromCol(colId);
  if (profileEmail) return { kind: "user", profileEmail };
  throw new Error(`Unknown column id: ${colId}`);
}

export const sortableId = (colId: string, taskId: string) =>
  `${colId}::${taskId}`;

export function fromServer(tasks: TaskView[]): ClientTask[] {
  return tasks.map((t) => ({
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    team: t.team,
    tags: t.tags.map((tg) => tg.name),
    links: t.links.map((l) => ({ id: l.id, url: l.url, title: l.title })),
    assignees: t.assignees.map((a) => ({ profileEmail: a.profileEmail })),
    dueDate: t.dueDate,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  }));
}

export function belongsTo(task: ClientTask, colId: string): boolean {
  if (colId === "backlog") return task.status === "backlog";
  if (colId === "done") return task.status === "done";
  const email = userFromCol(colId);
  if (email)
    return (
      task.status === "active" &&
      task.assignees.some((a) => a.profileEmail === email)
    );
  return false;
}

export function colTasks(tasks: ClientTask[], colId: string): ClientTask[] {
  const list = tasks.filter((t) => belongsTo(t, colId));
  const comparisonFn = colId === "done" ? compareDoneTasks : compareTasks;
  return list.sort((a, b) => comparisonFn(a, b));
}

export function statusTasks(
  tasks: ClientTask[],
  status: TaskStatus
): ClientTask[] {
  const list = tasks.filter((t) => t.status === status);
  const comparisonFn = status === "done" ? compareDoneTasks : compareTasks;
  return list.sort((a, b) => comparisonFn(a, b));
}

// The column a task sits in now, for a move's `from`. An active task with no
// assignees is not structurally impossible, and "user-undefined" would fail
// moveTaskSchema's email check — fall back to backlog.
export function taskColId(task: ClientTask): string {
  if (task.status === "done") return "done";
  const first = task.assignees[0]?.profileEmail;
  if (task.status === "active" && first) return userColId(first);
  return "backlog";
}

export function compareTasks(a: SortableTask, b: SortableTask): number {
  // first is priority
  const rankA = priorityRank(a.priority);
  const rankB = priorityRank(b.priority);
  if (rankA !== rankB) {
    return rankB - rankA;
  }

  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    if (a.dueDate < b.dueDate) {
      return -1;
    } else {
      return 1;
    }
  }

  return b.number - a.number;
}

export function compareDoneTasks(a: ClientTask, b: ClientTask): number {
  const at = a.completedAt ? Date.parse(a.completedAt) : 0;
  const bt = b.completedAt ? Date.parse(b.completedAt) : 0;
  if (at !== bt) {
    return bt - at;
  }

  return b.number - a.number;
}

export function applyDragLocal(
  tasks: ClientTask[],
  taskId: string,
  fromCol: string,
  toCol: string
): ClientTask[] {
  const t = tasks.find((x) => x.id === taskId);
  if (!t) return tasks;

  let status = t.status;
  let assignees = [...t.assignees];
  const oldEmail = userFromCol(fromCol);
  const newEmail = userFromCol(toCol);

  if (toCol === "backlog") {
    if (oldEmail) {
      assignees = assignees.filter((a) => a.profileEmail !== oldEmail);
      if (assignees.length === 0) status = "backlog";
    } else {
      status = "backlog";
      assignees = [];
    }
  } else if (toCol === "done") {
    status = "done";
  } else if (newEmail) {
    status = "active";
    if (oldEmail && oldEmail !== newEmail) {
      assignees = assignees.filter((a) => a.profileEmail !== oldEmail);
    }
    if (!assignees.some((a) => a.profileEmail === newEmail)) {
      assignees.push({ profileEmail: newEmail });
    }
  }

  // Mirror the server's completedAt handling so a done row sorts by
  // compareDoneTasks immediately instead of jumping on the refetch.
  const isDone = status === "done";
  const wasDone = t.status === "done";
  const completedAt =
    isDone && !wasDone
      ? new Date().toISOString()
      : !isDone && wasDone
        ? null
        : t.completedAt;

  return tasks.map((x) =>
    x.id === taskId ? { ...x, status, assignees, completedAt } : x
  );
}
