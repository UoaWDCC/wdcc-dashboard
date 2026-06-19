"use client";

import { useFlyOrgQueries } from "@/lib/flyio/queries";
import type { OrgApps } from "@/lib/flyio/types";
import { FlySummaryStats } from "./FlySummaryStats";
import { FlyOrgGroup } from "./FlyOrgGroup";

export function FlyMetrics({
  orgSlugs,
  initialData,
}: {
  orgSlugs: string[];
  initialData: OrgApps[];
}) {
  const results = useFlyOrgQueries(orgSlugs, initialData);

  const orgs: OrgApps[] = orgSlugs
    .map((slug, i) => ({ slug, apps: results[i].data ?? [] }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const errors = orgSlugs.flatMap((slug, i) =>
    results[i].isError
      ? [{ slug, message: results[i].error instanceof Error ? results[i].error.message : "Failed to load" }]
      : []
  );

  return (
    <div className="space-y-6">
      <FlySummaryStats orgs={orgs} />

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map(({ slug, message }) => (
            <p key={slug} className="text-destructive text-sm">
              {slug}: {message}
            </p>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Apps</h2>
          <span className="text-xs text-muted-foreground">grouped by org · alphabetical</span>
        </div>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {orgs.length === 0 ? (
            <p className="text-muted-foreground text-sm px-4 py-6">No orgs configured.</p>
          ) : (
            orgs.map(({ slug, apps }) => (
              <FlyOrgGroup key={slug} slug={slug} apps={apps} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
