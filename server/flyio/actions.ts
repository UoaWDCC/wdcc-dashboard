"use server";

import { requireUser } from "@/lib/access";
import { flyFetch } from "@/server/flyio/fetcher";
import type { FlyAppsResponse, FlyApp, FlyMachine, FlyOrgMetrics, PrometheusQueryResponse } from "@/lib/flyio/types";

const APPS_BASE = "https://api.machines.dev/v1/apps";

export async function listAppsForOrg(slug: string): Promise<FlyApp[]> {
  await requireUser();
  const { apps } = await flyFetch<FlyAppsResponse>(`${APPS_BASE}?org_slug=${encodeURIComponent(slug)}`, slug);
  return apps;
}

export async function listMachinesForApp(appName: string, slug: string): Promise<FlyMachine[]> {
  await requireUser();

  return flyFetch<FlyMachine[]>(`${APPS_BASE}/${encodeURIComponent(appName)}/machines`, slug);
}

const PROM_BASE = "https://api.fly.io/prometheus";
// CPU%: sum non-idle mode rate over idle+non-idle rate, per instance, then averaged across an app's instances.
const CPU_QUERY =
  "avg by (app) (" +
  'sum by (app, instance) (rate(fly_instance_cpu{mode!="idle"}[5m])) ' +
  "/ sum by (app, instance) (rate(fly_instance_cpu[5m]))" +
  ") * 100";

// MEM%: used/total per instance, then averaged across an app's instances.
const MEM_QUERY =
  "avg by (app) (" +
  "(fly_instance_memory_mem_total - fly_instance_memory_mem_available) " +
  "/ fly_instance_memory_mem_total * 100" +
  ")";

function queryPrometheus(slug: string, promql: string): Promise<PrometheusQueryResponse> {
  const url = `${PROM_BASE}/${encodeURIComponent(slug)}/api/v1/query?query=${encodeURIComponent(promql)}`;
  return flyFetch<PrometheusQueryResponse>(url, slug);
}

export async function getMetricsForOrg(slug: string): Promise<FlyOrgMetrics> {
  await requireUser();

  const [cpu, mem] = await Promise.all([
    queryPrometheus(slug, CPU_QUERY),
    queryPrometheus(slug, MEM_QUERY),
  ]);

  const metrics: FlyOrgMetrics = {};
  for (const { metric, value } of cpu.data.result) {
    if (!metric.app) continue;
    metrics[metric.app] = { cpuPercent: Math.round(Number(value[1])), memPercent: null };
  }
  for (const { metric, value } of mem.data.result) {
    if (!metric.app) continue;
    metrics[metric.app] = { ...(metrics[metric.app] ?? { cpuPercent: null, memPercent: null }), memPercent: Math.round(Number(value[1])) };
  }

  return metrics;
}
