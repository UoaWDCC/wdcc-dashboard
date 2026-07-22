import { ChevronRight } from "lucide-react";
import { countStates } from "@/lib/flyio/utils";
import { FlyAppCard } from "./FlyAppCard";
import { StatusBar } from "./StatusBar";
import type { FlyAppWithDetails } from "@/lib/flyio/types";

export function FlyOrg({
  slug,
  apps,
}: {
  slug: string;
  apps: FlyAppWithDetails[];
}) {
  const sorted = [...apps].sort((a, b) => a.name.localeCompare(b.name));
  const total = apps.length;

  const counts = countStates(apps);
  const running = counts.started;

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="list-none cursor-pointer select-none">
        <div className="grid grid-cols-[18px_1.4fr_1fr_90px] gap-3 items-center px-4 py-3.5 text-sm hover:bg-muted transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />

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

            <StatusBar counts={counts} total={total} />
          </div>

          {/* TODO: Implement Cost */}
          <div className="text-right font-heading font-semibold text-[13px] tabular-nums text-muted-foreground">
            —
          </div>
        </div>
      </summary>

      <div className="bg-muted border-t border-border px-4 pb-4 pt-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((app) => (
            <FlyAppCard key={app.id} app={app} metrics={app.metrics} />
          ))}
        </div>
      </div>
    </details>
  );
}
