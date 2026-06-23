import { STATE_META } from "@/lib/flyio/styles";
import type { DisplayState } from "@/lib/flyio/types";
import type { StateCounts } from "@/lib/flyio/utils";

const STATE_ORDER: DisplayState[] = ["started", "created", "failed", "suspended", "stopped", "other"];

export function StatusBar({ counts, total }: { counts: StateCounts; total: number }) {
  if (total === 0) return null;

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
