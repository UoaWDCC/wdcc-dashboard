// ── Apps ─────────────────────────────────────────────────────────────

type FlyOrganization = {
  internal_numeric_id: number;
  name: string;
  slug: string;
};

type FlyApp = {
  id: string;
  internal_numeric_id: number;
  machine_count: number;
  name: string;
  network: string;
  organization: FlyOrganization;
  status: string;
  volume_count: number;
};

export type FlyAppsResponse = {
  apps: FlyApp[];
  total_apps: number;
};

// ── Machines ──────────────────────────────────────────────────────────

type FlyMachineGuest = {
  cpu_kind: string;
  cpus: number;
  memory_mb: number;
};

type FlyMachineConfig = {
  guest: FlyMachineGuest;
};

type FlyMachineEvent = {
  status: string;
  timestamp: number;
};

export type FlyMachine = {
  id: string;
  name: string;
  state: string;
  region?: string;
  config: FlyMachineConfig | null;
  events: FlyMachineEvent[];
};

// ── Prometheus metrics ────────────────────────────────────────────────
// Source: https://api.fly.io/prometheus/<org>/api/v1/query (same Bearer token)
// Per-instance labels: app, region, host (4-char hex), instance
// CPU%: rate(fly_instance_cpu{mode!="idle",app,instance}[5m]) / rate(fly_instance_cpu{app,instance}[5m]) * 100
// MEM%: (fly_instance_memory_mem_total - fly_instance_memory_mem_available) / fly_instance_memory_mem_total * 100
// Aggregated across all instances per app before being passed to the UI.
export type FlyAppMetrics = {
  cpuPercent: number | null;
  memPercent: number | null;
};

// ── Composite ─────────────────────────────────────────────────────────

export type FlyAppWithMachines = FlyApp & { machines: FlyMachine[] };

export type OrgApps = {
  slug: string;
  apps: FlyAppWithMachines[];
};

// ── Display ───────────────────────────────────────────────────────────

export type DisplayState = "started" | "created" | "suspended" | "stopped" | "failed" | "other";
