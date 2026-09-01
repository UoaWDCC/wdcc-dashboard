export type ViewMode = "list" | "board";

export const VIEW_COOKIE = "tasks_view";
export const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isViewMode(value: string | undefined): value is ViewMode {
  return value === "list" || value === "board";
}
