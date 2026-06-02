import { flyFetch } from "./client";
import { orgSlugs } from "./config";
import type { FlyApp, FlyAppsResponse } from "./types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

async function fetchOrgApps(slug: string): Promise<FlyApp[]> {
  const url = `${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`;
  const res = await flyFetch(url, slug);
  if (!res.ok) return [];
  const json: FlyAppsResponse = await res.json();
  return json.apps ?? [];
}

export async function fetchAllApps(): Promise<FlyApp[]> {
  if (orgSlugs.length === 0) return [];
  const results = await Promise.all(orgSlugs.map(fetchOrgApps));
  return results.flat();
}
