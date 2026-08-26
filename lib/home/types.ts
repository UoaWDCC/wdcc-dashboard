import type { TaskView } from "@/lib/tasks/types";
import type { Team } from "@/lib/types";

export type MyTask = {
  id: string;
  number: number;
  title: string;
  priority: TaskView["priority"];
  team: TaskView["team"];
  dueDate: string | null;
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
