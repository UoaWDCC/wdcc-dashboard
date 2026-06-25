"use server";

import { requireUser } from "@/lib/access";
import { flyFetch } from "@/server/flyio/fetcher";
import type { FlyAppsResponse, FlyApp, FlyMachine } from "@/lib/flyio/types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function listAppsForOrg(slug: string): Promise<FlyApp[]> {
  await requireUser();
  const { apps } = await flyFetch<FlyAppsResponse>(`${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`, slug);
  return apps;
}

export async function listMachinesForApp(appName: string, slug: string): Promise<FlyMachine[]> {
  await requireUser();
  
  return flyFetch<FlyMachine[]>(`${APPS_BASE}/${encodeURIComponent(appName)}/machines`, slug);
}
