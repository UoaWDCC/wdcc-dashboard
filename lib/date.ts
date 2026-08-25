// The club runs on NZ time — "today" must mean the same day for the server, the
// database and the browser, regardless of where any of them think they are.
const APP_TIME_ZONE = "Pacific/Auckland";

// en-CA formats as YYYY-MM-DD, which compares like a `date` column.
const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
});

export function getTodayIso(): string {
  return isoFormatter.format(new Date());
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

export const DUE_CLASS: Record<DueState, string> = {
  overdue: "border-red-500/40 text-red-600 dark:text-red-400",
  today: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  soon: "border-foreground/20 text-muted-foreground",
  later: "border-foreground/15 text-muted-foreground",
};

// Lives here rather than in lib/linktree so client components can import it
// without pulling the database client into the browser bundle.
export function isLinkExpired(
  eventDate: string | null,
  today: string = getTodayIso()
): boolean {
  return eventDate !== null && eventDate < today;
}
