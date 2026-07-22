import { useQueries } from "@tanstack/react-query";
import { listAppsForOrg, listMachinesForApp, getMetricsForOrg } from "@/server/flyio/actions";
import type { FlyApp } from "./types";

export const appsQuery = (slug: string) => ({
  queryKey: ["fly", "apps", slug] as const,
  queryFn: () => listAppsForOrg(slug),
});

export const machinesQuery = (slug: string, appName: string) => ({
  queryKey: ["fly", "machines", slug, appName] as const,
  queryFn: () => listMachinesForApp(appName, slug),
});

export const metricsQuery = (slug: string) => ({
  queryKey: ["fly", "metrics", slug] as const,
  queryFn: () => getMetricsForOrg(slug),
});

export function useFlyAppsQueries(orgSlugs: string[]) {
  return useQueries({
    queries: orgSlugs.map((slug) => appsQuery(slug)),
  });
}

export function useFlyMachinesQueries(apps: { app: FlyApp; slug: string }[]) {
  return useQueries({
    queries: apps.map(({ app, slug }) => machinesQuery(slug, app.name)),
  });
}

export function useFlyMetricsQueries(orgSlugs: string[]) {
  return useQueries({
    queries: orgSlugs.map((slug) => metricsQuery(slug)),
  });
}
