import { BoardPulse, HomeSummary, MyTask } from "@/lib/home/types";
import { TaskView } from "@/lib/tasks/types";
import { Team } from "@/lib/types";

const DONE_WINDOW_DAYS = 7;

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
    if (t.status === "backlog") {
      if (t.team == null || t.team == team) {
        pulse.backlog++;
      }
    }
    if (t.status === "active") pulse.active++;
    if (t.status === "done") {
      if (t.completedAt && t.completedAt.getTime() >= doneCutoff) {
        pulse.doneThisWeek++;
      }
      continue;
    }
    if (t.dueDate && t.dueDate < today) pulse.overdue++;
    if (t.status != "active") continue;

    const mine = t.assignees.find((a) => a.profileEmail === email);
    if (!mine) continue;

    pulse.mine++;
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
