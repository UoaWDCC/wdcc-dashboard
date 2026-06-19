import { useQueries } from "@tanstack/react-query";
import { listAppsWithMachinesForOrg } from "@/server/flyio/actions";
import type { OrgApps } from "./types";

export function useFlyOrgQueries(orgSlugs: string[], initialData: OrgApps[]) {
  return useQueries({
    queries: orgSlugs.map((slug) => ({
      queryKey: ["fly", "apps", slug] as const,
      queryFn: () => listAppsWithMachinesForOrg(slug),
      initialData: initialData.find((d) => d.slug === slug)?.apps,
    })),
  });
}
