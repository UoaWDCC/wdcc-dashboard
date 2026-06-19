import type { OrgApps } from "@/lib/flyio/types";
import { countStates } from "@/lib/flyio/display";
import type { FlyAppWithMachines } from "@/lib/flyio/types";

function StatCard({
  label,
  value,
  unit,
  sub,
  subClass,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  subClass?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3.5">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="font-heading text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-[13px] text-muted-foreground font-medium">{unit}</span>}
      </div>
      <div className={`text-[12px] mt-0.5 ${subClass ?? "text-muted-foreground"}`}>{sub}</div>
    </div>
  );
}

export function FlySummaryStats({ orgs }: { orgs: OrgApps[] }) {
  const allApps: FlyAppWithMachines[] = orgs.flatMap((o) => o.apps);
  const total = allApps.length;
  const counts = countStates(allApps);
  const running = counts.started;
  const issues = counts.error + counts.stopped;
  const uptimePct = total > 0 ? Math.round((running / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Running"
        value={String(running)}
        unit={`/ ${total} apps`}
        sub={`${uptimePct}% up`}
        subClass={running === total ? "text-brand-green" : "text-muted-foreground"}
      />
      <StatCard
        label="Issues"
        value={String(issues)}
        sub={
          issues === 0
            ? "all clear"
            : `${counts.error} errored · ${counts.stopped} stopped`
        }
        subClass={issues > 0 ? "text-brand-pink" : "text-brand-green"}
      />
      <StatCard
        label="Avg CPU / MEM"
        value="—"
        sub="metrics not yet connected"
        subClass="text-muted-foreground"
      />
      <StatCard
        label="Monthly cost"
        value="—"
        sub="calculation pending"
        subClass="text-muted-foreground"
      />
    </div>
  );
}
