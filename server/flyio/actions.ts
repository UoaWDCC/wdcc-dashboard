"use server";

import { requireUser } from "@/lib/access";
import { flyFetch } from "@/server/flyio/fetcher";
import type { FlyAppsResponse, FlyAppWithMachines, FlyMachine } from "@/lib/flyio/types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function listAppsWithMachinesForOrg(slug: string): Promise<FlyAppWithMachines[]> {
  await requireUser();

  const { apps } = await flyFetch<FlyAppsResponse>(`${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`, slug);

  const settled = await Promise.allSettled(
    apps.map(async (app) => ({
      ...app,
      machines: await flyFetch<FlyMachine[]>(`${APPS_BASE}/${encodeURIComponent(app.name)}/machines`, slug),
    }))
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<FlyAppWithMachines> => r.status === "fulfilled")
    .map((r) => r.value);
}
