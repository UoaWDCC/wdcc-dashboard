import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { orgSlugs } from "@/lib/flyio/config";
import { listAppsForOrg, listMachinesForApp } from "@/server/flyio/actions";
import { FlyMetrics } from "@/components/tech/FlyMetrics";
import type { FlyApp } from "@/lib/flyio/types";

export default async function TechPage() {
  if (orgSlugs.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Tech</h1>
        <p className="text-muted-foreground text-sm">
          Set <code>FLY_TOKENS</code> to get started.
        </p>
      </div>
    );
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await Promise.all(
    orgSlugs.map((slug) =>
      queryClient.prefetchQuery({
        queryKey: ["fly", "apps", slug],
        queryFn: () => listAppsForOrg(slug),
      })
    )
  );

  const allApps = orgSlugs.flatMap((slug) => {
    const apps = queryClient.getQueryData<FlyApp[]>(["fly", "apps", slug]) ?? [];
    return apps.map((app) => ({ app, slug }));
  });

  await Promise.all(
    allApps.map(({ app, slug }) =>
      queryClient.prefetchQuery({
        queryKey: ["fly", "machines", slug, app.name],
        queryFn: () => listMachinesForApp(app.name, slug),
      })
    )
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tech</h1>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <FlyMetrics orgSlugs={orgSlugs} />
      </HydrationBoundary>
    </div>
  );
}
