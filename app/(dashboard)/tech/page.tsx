import { fetchOrgApps } from "@/lib/flyio/apps";
import { orgSlugs } from "@/lib/flyio/config";

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

  const appsByOrg = await Promise.all(
    orgSlugs.map(async (slug) => ({ slug, apps: await fetchOrgApps(slug) }))
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Tech</h1>
      {appsByOrg.map(({ slug, apps }) => (
        <div key={slug} className="space-y-2">
          <h2 className="text-sm font-medium">{slug}</h2>
          {apps.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No apps found. Check that the org slug and token are correct, or the org may have no apps.
            </p>
          ) : (
            <pre className="bg-muted rounded-md p-4 text-xs overflow-auto">
              {JSON.stringify(apps, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
