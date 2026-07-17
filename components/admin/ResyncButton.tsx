"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { resyncDocsAccessGroupAction } from "@/server/admin/actions";

export function ResyncButton() {
  const m = useMutation({
    mutationFn: () => resyncDocsAccessGroupAction(),
  });

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={m.isPending}
        onClick={() => m.mutate()}
      >
        {m.isPending ? "Syncing…" : "Resync docs access"}
      </Button>
      {m.isSuccess && (
        <span className="text-xs text-muted-foreground">Synced.</span>
      )}
      {m.isError && (
        <span className="text-xs text-destructive">
          {m.error instanceof Error ? m.error.message : "Sync failed"}
        </span>
      )}
    </div>
  );
}
