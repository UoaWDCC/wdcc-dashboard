import { useQueries } from "@tanstack/react-query";
import { listAppsForOrg, listMachinesForApp } from "@/server/flyio/actions";
import type { FlyApp } from "./types";

export function useFlyAppsQueries(orgSlugs: string[]) {
  return useQueries({
    queries: orgSlugs.map((slug) => ({
      queryKey: ["fly", "apps", slug] as const,
      queryFn: () => listAppsForOrg(slug),
    })),
  });
}

export function useFlyMachinesQueries(apps: { app: FlyApp; slug: string }[]) {
  return useQueries({
    queries: apps.map(({ app, slug }) => ({
      queryKey: ["fly", "machines", slug, app.name] as const,
      queryFn: () => listMachinesForApp(app.name, slug),
    })),
  });
}
