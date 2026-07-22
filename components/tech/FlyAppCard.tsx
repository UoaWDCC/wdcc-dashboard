import { deriveAppState, machineTypeLabel, uniqueRegions } from "@/lib/flyio/utils";
import { STATE_META } from "@/lib/flyio/styles";
import { UtilBar } from "./UtilBar";
import type { FlyAppWithMachinesAndMetrics } from "@/lib/flyio/types";

export function FlyAppCard({
  app,
}: {
  app: FlyAppWithMachinesAndMetrics;
}) {
  const appStatus = deriveAppState(app);
  const regions = uniqueRegions(app);
  const machineType = machineTypeLabel(app);

  const { label, badgeClass, accentClass } = STATE_META[appStatus];

  return (
    <div className="relative bg-card border border-border rounded-lg overflow-hidden flex flex-col gap-3 p-4 hover:border-brand-blue hover:shadow-sm transition-all cursor-pointer group">
      {/* Left edge state accent */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.75 ${accentClass} transition-opacity group-hover:opacity-70`}
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
            className={`w-1.5 h-1.5 rounded-full ${appStatus === "started" ? "bg-brand-green status-dot-pulse" : accentClass}`}
            aria-hidden="true"
          />
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <UtilBar label="CPU" value={app.metrics.cpuPercent} />
        <UtilBar label="MEM" value={app.metrics.memPercent} />
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-border text-xs">
        <span className="text-muted-foreground font-medium">{machineType}</span>
        <span className="text-muted-foreground font-medium">—/mo</span>
      </div>
    </div>
  );
}
