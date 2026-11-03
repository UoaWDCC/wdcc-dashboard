import type { CheckInFlag, Team } from "@/lib/types";

export const CHECK_IN_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10] as const;
export type CheckInMonth = (typeof CHECK_IN_MONTHS)[number];

export const MONTH_LABEL: Record<CheckInMonth, string> = {
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
};

export const FLAG_LABEL: Record<CheckInFlag, string> = {
  follow_up: "Follow up",
  inquire: "Inquire",
};

export const FLAG_BADGE: Record<CheckInFlag, string> = {
  follow_up:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  inquire:
    "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export type CheckInCell = {
  profileEmail: string;
  month: CheckInMonth;
  checked: boolean;
  flag: CheckInFlag | null;
  note: string | null;
};

export type CheckInPerson = {
  email: string;
  name: string;
  team: Team | null;
};

export type CheckInSheet = {
  year: number;
  people: CheckInPerson[];
  cells: CheckInCell[];
};

export type CheckInPatch = {
  profileEmail: string;
  year: number;
  month: CheckInMonth;
  checked?: boolean;
  flag?: CheckInFlag | null;
  note?: string | null;
};

export const MIN_CHECK_IN_YEAR = 2020;
export const MAX_CHECK_IN_YEAR = 2100;
