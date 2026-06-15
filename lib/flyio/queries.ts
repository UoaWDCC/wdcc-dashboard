import { useQueries } from "@tanstack/react-query";
import { listAppsForOrg } from "@/server/flyio/actions";
import type { OrgApps } from "./types";

export function useFlyOrgQueries(orgSlugs: string[], initialData: OrgApps[]) {
  return useQueries({
    queries: orgSlugs.map((slug) => ({
      queryKey: ["fly", "apps", slug] as const,
      queryFn: () => listAppsForOrg(slug),
      initialData: initialData.find((d) => d.slug === slug)?.apps,
    })),
  });
}
