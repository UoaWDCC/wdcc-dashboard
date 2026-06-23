import { FlySummaryCard } from "./FlySummaryCard";
import { countStates } from "@/lib/flyio/utils";
import type { OrgApps, FlyAppWithMachines } from "@/lib/flyio/types";

export function FlySummary({ orgs }: { orgs: OrgApps[] }) {
  const allApps: FlyAppWithMachines[] = orgs.flatMap((o) => o.apps);
  const total = allApps.length;

  const counts = countStates(allApps);
  const running = counts.started;
  const failed = counts.failed;

  const uptimePct = total > 0 ? Math.round((running / total) * 100) : 0;

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

      {/* TODO: populate once Prometheus metrics are wired */}
      <FlySummaryCard
        label="Avg CPU / MEM"
        value="—"
        sub="metrics not yet connected"
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
