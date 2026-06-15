"use server";

import { flyFetch } from "@/lib/flyio/fetcher";
import { requireUser } from "@/lib/access";
import type { FlyApp, FlyAppsResponse } from "@/lib/flyio/types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function listAppsForOrg(slug: string): Promise<FlyApp[]> {
  await requireUser();

  const res = await flyFetch(
    `${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`,
    slug
  );
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  
  const json: FlyAppsResponse = await res.json();
  return json.apps;
}
