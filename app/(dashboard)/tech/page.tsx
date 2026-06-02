import { fetchAllApps } from "@/lib/flyio/apps";

export default async function TechPage() {
  const apps = await fetchAllApps();

  if (apps.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Tech</h1>
        <p className="text-muted-foreground text-sm">
          Set <code>FLY_TOKENS</code> to get started.
        </p>
      </div>
    );
  }

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
