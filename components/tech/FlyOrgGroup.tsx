import type { FlyAppWithMachines, FlyAppMetrics } from "@/lib/flyio/types";
import { countStates, STATE_META } from "@/lib/flyio/display";
import type { DisplayState } from "@/lib/flyio/display";
import { FlyAppCard } from "./FlyAppCard";

const STUB_METRICS: FlyAppMetrics = { cpuPercent: null, memPercent: null };

const STATE_ORDER: DisplayState[] = ["started", "deploying", "error", "stopped"];

function StatusMiniBar({ apps }: { apps: FlyAppWithMachines[] }) {
  const total = apps.length;
  if (total === 0) return null;
  const counts = countStates(apps);
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary w-20" aria-hidden="true">
      {STATE_ORDER.map((state) => {
        const pct = (counts[state] / total) * 100;
        if (!pct) return null;
        return (
          <span
            key={state}
            className={`block h-full ${STATE_META[state].barClass}`}
            style={{ width: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

export function FlyOrgGroup({ slug, apps }: { slug: string; apps: FlyAppWithMachines[] }) {
  const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
  const counts = countStates(apps);
  const total = apps.length;
  const running = counts.started;

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="list-none cursor-pointer select-none">
        <div className="grid grid-cols-[18px_1.4fr_1fr_90px] sm:grid-cols-[18px_1.6fr_1.2fr_1fr_90px] gap-3 items-center px-4 py-3.5 text-sm hover:bg-muted transition-colors">
          {/* Chevron */}
          <svg
            className="w-3.5 h-3.5 text-muted-foreground transition-transform group-open:rotate-90"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>

          {/* Org name */}
          <div className="font-heading font-semibold text-[14px]">
            {slug}
            <span className="text-muted-foreground font-normal text-[12px] ml-1.5">
              {total} app{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Status: X/Y up + mini bar */}
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="tabular-nums">
              {running}/{total} up
            </span>
            <StatusMiniBar apps={apps} />
          </div>

          {/* CPU/MEM — hidden on small screens */}
          <div className="hidden sm:grid grid-cols-[26px_1fr_26px_1fr] gap-1.5 items-center text-[10px] text-muted-foreground font-medium">
            <span>CPU</span>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-0 rounded-full bg-brand-blue" />
            </div>
            <span>MEM</span>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-0 rounded-full bg-brand-blue" />
            </div>
          </div>

          {/* Cost */}
          <div className="text-right font-heading font-semibold text-[13px] tabular-nums text-muted-foreground">
            —
          </div>
        </div>
      </summary>

      <div className="bg-muted border-t border-border px-4 pb-4 pt-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((app) => (
            <FlyAppCard key={app.id} app={app} metrics={STUB_METRICS} />
          ))}
        </div>
      </div>
    </details>
  );
}
