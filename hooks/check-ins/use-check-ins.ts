"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateCheckInAction } from "@/server/check-ins/actions";
import type { CheckInPatch, CheckInSheet } from "@/lib/check-ins/types";
import { findCell, revertPatch, upsertCell } from "@/lib/check-ins/utils";
import { checkInKeys, checkInSheetQuery } from "./query-options";

export { checkInKeys };

export function useCheckInSheet(initial: CheckInSheet) {
  return useQuery(checkInSheetQuery(initial));
}

export function useUpdateCheckIn(year: number) {
  const queryClient = useQueryClient();
  const key = checkInKeys.sheet(year);
  return useMutation({
    mutationKey: checkInKeys.update,
    mutationFn: (patch: CheckInPatch) => updateCheckInAction(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const sheet = queryClient.getQueryData<CheckInSheet>(key);
      const before = findCell(sheet, patch.profileEmail, patch.month);
      queryClient.setQueryData<CheckInSheet>(key, (prev) =>
        prev ? upsertCell(prev, patch) : prev
      );
      return { before };
    },
    onError: (err, patch, ctx) => {
      console.error("updateCheckInAction failed", err);
      toast.error("Failed to save check-in");
      if (!ctx) return;
      queryClient.setQueryData<CheckInSheet>(key, (prev) =>
        prev ? upsertCell(prev, revertPatch(ctx.before, patch)) : prev
      );
    },
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: checkInKeys.update }) <= 1) {
        return queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}
