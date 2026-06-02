import { fetchAllApps } from "@/lib/flyio/apps";
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

  const apps = await fetchAllApps();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tech</h1>
      <pre className="bg-muted rounded-md p-4 text-xs overflow-auto">
        {JSON.stringify(
          apps,
          (_, v) =>
            v && typeof v === "object" && !Array.isArray(v)
              ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
              : v,
          2
        )}
      </pre>
    </div>
  );
}
