import { flyFetch } from "./fetcher";
import type { FlyApp, FlyAppsResponse } from "./types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function fetchOrgApps(slug: string): Promise<FlyApp[]> {
  const url = `${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`;

  const res = await flyFetch(url, slug);
  if (!res.ok) return [];

  const json: FlyAppsResponse = await res.json();
  return json.apps ?? [];
}

