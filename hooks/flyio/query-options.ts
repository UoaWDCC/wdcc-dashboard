import {
  listAppsForOrg,
  listMachinesForApp,
  getMetricsForOrg,
} from "@/server/flyio/actions";

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
