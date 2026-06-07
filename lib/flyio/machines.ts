import { flyFetch } from "./fetcher";
import type { FlyMachine } from "./types";
import { APPS_BASE } from "./apps";

export async function fetchAppMachines(appName: string, orgSlug: string): Promise<FlyMachine[]> {
  const url = `${APPS_BASE}/${encodeURIComponent(appName)}/machines`;
  
  return await flyFetch<FlyMachine[]>(url, orgSlug) ?? [];
}
