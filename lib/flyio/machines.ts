import { flyFetch } from "./fetcher";
import type { FlyMachine } from "./types";
import { APPS_BASE } from "./apps";

export async function fetchAppMachines(
  appName: string,
  orgSlug: string
): Promise<FlyMachine[]> {
  try {
    const url = `${APPS_BASE}/${encodeURIComponent(appName)}/machines`;
    const res = await flyFetch(url, orgSlug);
    
    if (!res.ok) return [];

    return await res.json();
  } catch {
    return [];
  }
}
