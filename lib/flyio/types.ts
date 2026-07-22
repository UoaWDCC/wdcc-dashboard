// These types are a hand-picked subset of the Fly Machines API response —
// only the fields this domain actually reads, not the full API shape. If
// you need a field that isn't here, see the full response schema at
// https://machines-api-spec.fly.dev/ and add just what you need.

// ── Apps ─────────────────────────────────────────────────────────────

export type FlyApp = {
  id: string;
  name: string;
};

export type FlyAppsResponse = {
  apps: FlyApp[];
};

// ── Machines ──────────────────────────────────────────────────────────

type FlyMachineGuest = {
  cpu_kind: string;
  cpus: number;
};

type FlyMachineConfig = {
  guest: FlyMachineGuest;
};

export type FlyMachine = {
  state: string;
  region?: string;
  config: FlyMachineConfig | null;
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

export type AppMetricsByName = Record<string, FlyAppMetrics>;

type PrometheusResult = {
  metric: { app?: string };
  value: [number, string];
};

export type PrometheusQueryResponse = {
  status: string;
  data: {
    resultType: string;
    result: PrometheusResult[];
  };
};

// ── Composite ─────────────────────────────────────────────────────────

export type FlyAppWithMachines = FlyApp & { machines: FlyMachine[] };

export type FlyAppWithMachinesAndMetrics = FlyAppWithMachines & { metrics: FlyAppMetrics };

export type OrgApps = {
  slug: string;
  apps: FlyAppWithMachinesAndMetrics[];
};

// ── Display ───────────────────────────────────────────────────────────

export type AppStatus = "started" | "created" | "suspended" | "stopped" | "failed" | "other";
