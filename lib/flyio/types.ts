export type FlyOrganization = {
  internal_numeric_id: number;
  name: string;
  slug: string;
};

export type FlyApp = {
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

export type OrgApps = {
  slug: string;
  apps: FlyApp[];
};
