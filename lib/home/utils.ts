import { DueState } from "@/lib/home/summary";

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
