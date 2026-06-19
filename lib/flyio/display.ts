import type { FlyAppWithMachines } from "./types";

export type DisplayState = "started" | "stopped" | "error" | "deploying";

const DEPLOYING_STATES = new Set(["creating", "launching", "replacing", "rebooting"]);

export function deriveAppState(app: FlyAppWithMachines): DisplayState {
  const { machines } = app;
  if (machines.length === 0) return "stopped";
  const states = machines.map((m) => m.state);
  if (states.some((s) => s === "failed")) return "error";
  if (states.some((s) => DEPLOYING_STATES.has(s))) return "deploying";
  if (states.some((s) => s === "started")) return "started";
  return "stopped";
}

export function machineTypeLabel(app: FlyAppWithMachines): string {
  const m = app.machines[0];
  if (!m?.config?.guest) return "—";
  const { cpu_kind, cpus } = m.config.guest;
  return `${cpu_kind === "performance" ? "perf" : "shared"}-${cpus}x`;
}

export function uniqueRegions(app: FlyAppWithMachines): string[] {
  return [
    ...new Set(
      app.machines.map((m) => m.region).filter((r): r is string => Boolean(r))
    ),
  ];
}

export type StateCounts = Record<DisplayState, number>;

export function countStates(apps: FlyAppWithMachines[]): StateCounts {
  const counts: StateCounts = { started: 0, stopped: 0, error: 0, deploying: 0 };
  for (const app of apps) counts[deriveAppState(app)]++;
  return counts;
}

export const STATE_META: Record<
  DisplayState,
  { label: string; barClass: string; badgeClass: string; accentClass: string }
> = {
  started:   { label: "Running",   barClass: "bg-brand-green",   badgeClass: "bg-brand-green/10 text-brand-green border-brand-green/20",       accentClass: "bg-brand-green" },
  deploying: { label: "Deploying", barClass: "bg-brand-orange",  badgeClass: "bg-brand-orange/10 text-brand-orange border-brand-orange/20",     accentClass: "bg-brand-orange" },
  error:     { label: "Errored",   barClass: "bg-brand-pink",    badgeClass: "bg-brand-pink/10 text-brand-pink border-brand-pink/20",           accentClass: "bg-brand-pink" },
  stopped:   { label: "Stopped",   barClass: "bg-muted-foreground/40", badgeClass: "bg-secondary text-muted-foreground border-border",          accentClass: "bg-muted-foreground/40" },
};
