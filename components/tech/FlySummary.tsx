import { FlySummaryCard } from "./FlySummaryCard";
import { countStates, deriveAppState } from "@/lib/flyio/utils";
import type { OrgApps, FlyAppWithMachinesAndMetrics } from "@/lib/flyio/types";

function average(values: number[]): number | null {
  return values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : null;
}

export function FlySummary({ orgs }: { orgs: OrgApps[] }) {
  const allApps: FlyAppWithMachinesAndMetrics[] = orgs.flatMap((o) => o.apps);
  const total = allApps.length;

  const counts = countStates(allApps);
  const running = counts.started;
  const failed = counts.failed;

  const uptimePct = total > 0 ? Math.round((running / total) * 100) : 0;

  const runningApps = allApps.filter((a) => deriveAppState(a) === "started");
  const avgCpu = average(runningApps.flatMap((a) => (a.metrics.cpuPercent !== null ? [a.metrics.cpuPercent] : [])));
  const avgMem = average(runningApps.flatMap((a) => (a.metrics.memPercent !== null ? [a.metrics.memPercent] : [])));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <FlySummaryCard
        label="Running"
        value={String(running)}
        unit={`/ ${total} apps`}
        sub={`${uptimePct}% up`}
        subClass={running === total ? "text-brand-green" : "text-muted-foreground"}
      />

      <FlySummaryCard
        label="Failed"
        value={String(failed)}
        sub={failed === 0 ? "all clear" : `${failed} app${failed !== 1 ? "s" : ""} failed`}
        subClass={failed > 0 ? "text-brand-pink" : "text-brand-green"}
      />

      <FlySummaryCard
        label="Avg CPU / MEM"
        value={avgCpu !== null ? `${avgCpu}%` : "—"}
        unit={avgMem !== null ? `/ ${avgMem}%` : undefined}
        sub={avgCpu !== null || avgMem !== null ? "across running apps" : "no data available"}
        subClass="text-muted-foreground"
      />

      {/* TODO: populate once Fly billing API is integrated */}
      <FlySummaryCard
        label="Monthly cost"
        value="—"
        sub="calculation pending"
        subClass="text-muted-foreground"
      />
    </div>
  );
}
