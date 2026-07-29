"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { resyncDocsAccessGroupAction } from "@/server/admin/actions";

export function ResyncButton() {
  const m = useMutation({
    mutationFn: () => resyncDocsAccessGroupAction(),
  });

  const failed = m.data && !m.data.ok ? m.data.error : null;
  const succeeded = m.data?.ok === true;

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
      {!m.isPending && succeeded && (
        <span className="text-xs text-muted-foreground">Synced.</span>
      )}
      {!m.isPending && failed && (
        <span className="text-xs text-destructive">{failed}</span>
      )}
    </div>
  );
}
