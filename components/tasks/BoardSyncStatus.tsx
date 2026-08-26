"use client";

import { useSyncExternalStore } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BOARD_POLL_MS } from "@/hooks/tasks/query-options";

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function useTabHidden() {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "hidden",
    () => false
  );
}

// Deliberately not driven by the drag/mutation pause gates or by isFetching:
// both clear within a second, so the dot would flicker on every interaction.
export function BoardSyncStatus({
  probe,
}: {
  probe: UseQueryResult<string, Error>;
}) {
  const hidden = useTabHidden();
  const stalled = probe.isError && probe.errorUpdateCount >= 2;

  const dot = stalled
    ? "bg-destructive"
    : hidden
      ? "bg-muted-foreground/40"
      : "bg-brand-green";
  const label = stalled
    ? "Live updates paused"
    : hidden
      ? "Paused while the tab is hidden"
      : `Live · checks every ${BOARD_POLL_MS / 1000}s`;

  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={label}
              className={`size-1.5 shrink-0 rounded-full ${dot}`}
            />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {stalled ? (
        <>
          <span className="text-muted-foreground text-xs">{label}</span>
          <Button size="sm" variant="ghost" onClick={() => probe.refetch()}>
            Retry
          </Button>
        </>
      ) : null}
    </div>
  );
}
