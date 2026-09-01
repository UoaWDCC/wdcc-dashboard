"use client";

import { useQueries } from "@tanstack/react-query";
import { appsQuery, machinesQuery, metricsQuery } from "./query-options";
import type { FlyApp } from "@/lib/flyio/types";

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
