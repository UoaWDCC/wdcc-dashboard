import { queryOptions } from "@tanstack/react-query";
import { getCheckInSheetAction } from "@/server/check-ins/actions";
import type { CheckInSheet } from "@/lib/check-ins/types";

export const checkInKeys = {
  sheet: (year: number) => ["check-ins", year] as const,
  update: ["check-ins-update"] as const,
};

export const checkInSheetQuery = (initial: CheckInSheet) =>
  queryOptions({
    queryKey: checkInKeys.sheet(initial.year),
    queryFn: () => getCheckInSheetAction(initial.year),
    initialData: initial,
  });
