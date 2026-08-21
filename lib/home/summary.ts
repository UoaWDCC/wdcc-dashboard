import type { TaskView } from "@/lib/tasks/types";
import type { Team } from "@/lib/types";

export type MyTask = {
  id: string;
  title: string;
  priority: TaskView["priority"];
  team: TaskView["team"];
  dueDate: string | null;
  position: number;
  otherAssignees: number;
};

export type BoardPulse = {
  backlog: number;
  active: number;
  mine: number;
  overdue: number;
  doneThisWeek: number;
};

export type HomeSummary = {
  myTasks: MyTask[];
  pulse: BoardPulse;
  today: string;
  team: Team | null;
};

const DONE_WINDOW_DAYS = 7;

// The board treats a task as "mine" when it is active and I am an assignee;
// ordering inside that column lives on task_assignee.position.
export function buildHomeSummary(
  tasks: TaskView[],
  email: string,
  today: string,
  team: Team | null
): HomeSummary {
  const doneCutoff = Date.now() - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const myTasks: MyTask[] = [];
  const pulse: BoardPulse = {
    backlog: 0,
    active: 0,
    mine: 0,
    overdue: 0,
    doneThisWeek: 0,
  };

  for (const t of tasks) {
    if (t.status === "backlog") pulse.backlog += 1;
    if (t.status === "active") pulse.active += 1;
    if (t.status === "done") {
      if (t.completedAt && t.completedAt.getTime() >= doneCutoff) {
        pulse.doneThisWeek += 1;
      }
      continue;
    }
    if (t.dueDate && t.dueDate < today) pulse.overdue += 1;

    if (t.status !== "active") continue;
    const mine = t.assignees.find((a) => a.profileEmail === email);
    if (!mine) continue;
    pulse.mine += 1;
    myTasks.push({
      id: t.id,
      title: t.title,
      priority: t.priority,
      team: t.team,
      dueDate: t.dueDate,
      position: mine.position,
      otherAssignees: t.assignees.length - 1,
    });
  }

  myTasks.sort((a, b) => a.position - b.position);
  return { myTasks, pulse, today, team };
}

export type DueState = "overdue" | "today" | "soon" | "later";

export function dueState(dueDate: string, today: string): DueState {
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  const diff =
    (Date.parse(dueDate) - Date.parse(today)) / (24 * 60 * 60 * 1000);
  return diff <= 3 ? "soon" : "later";
}

export function dueLabel(dueDate: string, today: string): string {
  const state = dueState(dueDate, today);
  if (state === "today") return "Due today";
  const [, m, d] = dueDate.split("-");
  const stamp = `${Number(d)}/${Number(m)}`;
  return state === "overdue" ? `Overdue ${stamp}` : `Due ${stamp}`;
}
