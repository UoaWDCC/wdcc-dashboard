"use client";

import { useFlyAppsQueries, useFlyMachinesQueries } from "@/lib/flyio/queries";
import { FlySummary } from "./FlySummary";
import { FlyOrg } from "./FlyOrg";
import type { FlyMachine, OrgApps } from "@/lib/flyio/types";

export function FlyMetrics({ orgSlugs }: { orgSlugs: string[] }) {
  const appResults = useFlyAppsQueries(orgSlugs);

  const allApps = orgSlugs.flatMap((slug, i) =>
    (appResults[i].data ?? []).map((app) => ({ app, slug }))
  );

  const machineResults = useFlyMachinesQueries(allApps);

  const machinesByKey = new Map<string, FlyMachine[]>();
  allApps.forEach(({ app, slug }, i) => {
    machinesByKey.set(`${slug}:${app.name}`, machineResults[i]?.data ?? []);
  });

  const orgs: OrgApps[] = orgSlugs
    .map((slug, i) => ({
      slug,
      apps: (appResults[i].data ?? []).map((app) => ({
        ...app,
        machines: machinesByKey.get(`${slug}:${app.name}`) ?? [],
      })),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const appErrors = orgSlugs.flatMap((slug, i) =>
    appResults[i].isError
      ? [{ key: slug, message: appResults[i].error instanceof Error ? appResults[i].error.message : "Failed to load" }]
      : []
  );

  const machineErrors = allApps.flatMap(({ app, slug }, i) =>
    machineResults[i]?.isError
      ? [{ key: `${slug}/${app.name}`, message: machineResults[i].error instanceof Error ? machineResults[i].error.message : "Failed to load machines" }]
      : []
  );

  const errors = [...appErrors, ...machineErrors];

  return (
    <div className="space-y-6">
      <FlySummary orgs={orgs} />

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map(({ key, message }) => (
            <p key={key} className="text-destructive text-sm">
              {key}: {message}
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
              <FlyOrg key={slug} slug={slug} apps={apps} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
