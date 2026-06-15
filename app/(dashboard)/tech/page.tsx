import { orgSlugs } from "@/lib/flyio/config";
import { listAppsForOrg } from "@/server/flyio/actions";
import { FlyMetrics } from "../../../components/tech/FlyMetrics";
import type { OrgApps } from "@/lib/flyio/types";

export default async function TechPage() {
  const settled = await Promise.allSettled(
    orgSlugs.map((slug) =>
      listAppsForOrg(slug).then((apps) => ({ slug, apps }))
    )
  );
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[flyio] SSR fetch failed for "${orgSlugs[i]}":`, r.reason);
    }
  });

  const initialData: OrgApps[] = settled.flatMap((r, i) =>
    r.status === "fulfilled" ? [r.value] : []
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tech</h1>

      {orgSlugs.length > 0 ? (
        <FlyMetrics orgSlugs={orgSlugs} initialData={initialData} />
      ) : (
        <p className="text-muted-foreground text-sm">
          Set <code>FLY_TOKENS</code> to get started.
        </p>
      )}
    </div>
  );
}
