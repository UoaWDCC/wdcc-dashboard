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
  config: FlyMachineConfig | null;
  events: FlyMachineEvent[];
};

// ── Composite ─────────────────────────────────────────────────────────

export type FlyAppWithMachines = FlyApp & { machines: FlyMachine[] };

export type OrgApps = {
  slug: string;
  apps: FlyAppWithMachines[];
};
