import { flyFetch } from "./fetcher";
import { fetchAppMachines } from "./machines";
import type { FlyApp, FlyAppsResponse, FlyAppWithMachines } from "./types";

export const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function fetchOrgApps(slug: string): Promise<FlyApp[]> {
  const url = `${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`;

  const res = await flyFetch(url, slug);
  if (!res.ok) return [];

  const json: FlyAppsResponse = await res.json();
  return json.apps ?? [];
}

export async function fetchOrgAppsWithMachines(
  slug: string
): Promise<FlyAppWithMachines[]> {
  const apps = await fetchOrgApps(slug);
  
  return Promise.all(
    apps.map(async (app) => ({
      ...app,
      machines: await fetchAppMachines(app.name, slug),
    }))
  );
}

