import { orgSlugs } from "@/lib/flyio/config";
import { listAppsWithMachinesForOrg } from "@/server/flyio/actions";
import { FlyMetrics } from "../../../components/tech/FlyMetrics";
import type { OrgApps } from "@/lib/flyio/types";

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

  const initialData: OrgApps[] = await Promise.all(
    orgSlugs.map(async (slug) => ({ slug, apps: await listAppsWithMachinesForOrg(slug) }))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tech</h1>
      <FlyMetrics orgSlugs={orgSlugs} initialData={initialData} />
    </div>
  );
}
