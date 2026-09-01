import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  PlayCircle,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardPulse as Pulse } from "@/lib/home/types";

type Tile = {
  label: string;
  value: number;
  icon: typeof Inbox;
  accent?: string;
};

export function BoardPulse({ pulse }: { pulse: Pulse }) {
  const tiles: Tile[] = [
    { label: "Backlog", value: pulse.backlog, icon: Inbox },
    { label: "Active", value: pulse.active, icon: PlayCircle },
    { label: "Assigned to me", value: pulse.mine, icon: UserRound },
    {
      label: "Overdue",
      value: pulse.overdue,
      icon: AlertTriangle,
      accent: pulse.overdue > 0 ? "text-red-600 dark:text-red-400" : undefined,
    },
    { label: "Done this week", value: pulse.doneThisWeek, icon: CheckCircle2 },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Link
            key={tile.label}
            href="/tasks"
            className="bg-card ring-foreground/10 hover:ring-brand-blue/40 rounded-xl px-4 py-3 ring-1 transition"
          >
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Icon className="size-3.5" />
              {tile.label}
            </div>
            <div
              className={cn(
                "font-heading mt-1 text-2xl font-semibold tabular-nums",
                tile.accent
              )}
            >
              {tile.value}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
