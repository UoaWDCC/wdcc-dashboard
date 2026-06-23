import type { DisplayState, FlyAppWithMachines } from "./types";

export type StateCounts = Record<DisplayState, number>;

export function countStates(apps: FlyAppWithMachines[]): StateCounts {
  const counts: StateCounts = { started: 0, created: 0, suspended: 0, stopped: 0, failed: 0, other: 0 };
  for (const app of apps) counts[deriveAppState(app)]++;
  
  return counts;
}

export function deriveAppState(app: FlyAppWithMachines): DisplayState {
  if (app.machines.length === 0) return "stopped";

  const states = new Set(app.machines.map((m) => m.state));
  if (states.has("failed")) return "failed";
  if (states.has("created")) return "created";
  if (states.has("started")) return "started";
  if (states.has("suspended")) return "suspended";
  if (states.has("stopped")) return "stopped";
  return "other";
}

// Uses only the first machine; assumes homogeneous types across multi-machine apps.
export function machineTypeLabel(app: FlyAppWithMachines): string {
  const m = app.machines[0];
  if (!m?.config?.guest) return "—";

  const { cpu_kind, cpus } = m.config.guest;
  
  return `${cpu_kind}-${cpus}x`;
}

export function uniqueRegions(app: FlyAppWithMachines): string[] {
  return [
    ...new Set(
      app.machines.map((m) => m.region).filter((r): r is string => Boolean(r))
    ),
  ];
}

