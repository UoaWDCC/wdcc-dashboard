"use client";

import { useFlyOrgQueries } from "@/lib/flyio/queries";
import type { OrgApps } from "@/lib/flyio/types";

export function TechView({
  orgSlugs,
  initialData,
}: {
  orgSlugs: string[];
  initialData: OrgApps[];
}) {
  const results = useFlyOrgQueries(orgSlugs, initialData);

  return (
    <>
      {orgSlugs.map((slug, i) => {
        const { data: apps, isError, error, isLoading } = results[i];

        return (
          <div key={slug} className="space-y-2">
            <h2 className="text-sm font-medium">{slug}</h2>
            
            {isError ? (
              <p className="text-destructive text-sm">
                {error instanceof Error ? error.message : "Failed to load apps."}
              </p>
            ) : isLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : apps?.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No apps found. Check that the org slug and token are correct, or
                the org may have no apps.
              </p>
            ) : (
              <pre className="bg-muted rounded-md p-4 text-xs overflow-auto">
                {JSON.stringify(apps, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </>
  );
}
