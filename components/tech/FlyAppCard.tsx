import type { FlyAppWithMachines, FlyAppMetrics } from "@/lib/flyio/types";
import { deriveAppState, machineTypeLabel, uniqueRegions, STATE_META } from "@/lib/flyio/display";

function Gauge({ label, value }: { label: string; value: number | null }) {
  const pct = value ?? 0;
  const colorClass =
    value === null
      ? "bg-muted-foreground/20"
      : pct >= 80
        ? "bg-brand-pink"
        : pct >= 60
          ? "bg-brand-orange"
          : "bg-brand-blue";

  return (
    <div className="grid grid-cols-[36px_1fr_44px] gap-2 items-center">
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: value === null ? "0%" : `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-right font-medium tabular-nums">
        {value === null ? <span className="text-muted-foreground">—</span> : `${pct}%`}
      </span>
    </div>
  );
}

export function FlyAppCard({
  app,
  metrics,
}: {
  app: FlyAppWithMachines;
  metrics: FlyAppMetrics;
}) {
  const state = deriveAppState(app);
  const { label, badgeClass, accentClass } = STATE_META[state];
  const regions = uniqueRegions(app);
  const machineType = machineTypeLabel(app);

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden flex flex-col gap-3 p-4 hover:border-brand-blue hover:shadow-sm transition-all cursor-pointer group">
      {/* Left edge state accent */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${accentClass} transition-opacity group-hover:opacity-70`}
        aria-hidden="true"
      />

      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="font-heading font-semibold text-[15px] truncate">{app.name}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {regions.length > 0 ? (
              regions.map((r) => (
                <span
                  key={r}
                  className="text-[11px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-md"
                >
                  {r}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full border ${badgeClass}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${state === "started" ? "bg-brand-green status-dot-pulse" : accentClass}`}
            aria-hidden="true"
          />
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Gauge label="CPU" value={metrics.cpuPercent} />
        <Gauge label="MEM" value={metrics.memPercent} />
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-border text-xs">
        <span className="text-muted-foreground font-medium">{machineType}</span>
        <span className="text-muted-foreground font-medium">—/mo</span>
      </div>
    </div>
  );
}
