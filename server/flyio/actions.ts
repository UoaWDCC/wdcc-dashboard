"use server";

import { requireUser } from "@/lib/access";
import { flyFetch } from "@/lib/flyio/fetcher";
import type { FlyAppsResponse, FlyAppWithMachines, FlyMachine } from "@/lib/flyio/types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function listAppsWithMachinesForOrg(slug: string): Promise<FlyAppWithMachines[]> {
  await requireUser();

  const json = await flyFetch<FlyAppsResponse>(`${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`, slug);
  const apps = json?.apps ?? [];

  return Promise.all(
    apps.map(async (app) => ({
      ...app,
      machines: await flyFetch<FlyMachine[]>(`${APPS_BASE}/${encodeURIComponent(app.name)}/machines`, slug) ?? [],
    }))
  );
}
