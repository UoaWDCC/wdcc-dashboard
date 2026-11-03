"use client";

import { useRouter } from "next/navigation";
import {
  useCheckInSheet,
  useUpdateCheckIn,
} from "@/hooks/check-ins/use-check-ins";
import {
  CHECK_IN_MONTHS,
  FLAG_BADGE,
  FLAG_LABEL,
  MONTH_LABEL,
  type CheckInSheet,
} from "@/lib/check-ins/types";
import { findCell } from "@/lib/check-ins/utils";
import { CHECK_IN_FLAGS, TEAM_BADGE } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CheckInCellView } from "./CheckInCell";

export function CheckInsView({
  initialSheet,
  years,
}: {
  initialSheet: CheckInSheet;
  years: number[];
}) {
  const router = useRouter();
  const { data: sheet } = useCheckInSheet(initialSheet);
  const update = useUpdateCheckIn(sheet.year);
  const total = sheet.people.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Check-ins</h1>
          <p className="text-muted-foreground text-sm">
            Tick a month once you have checked in with someone. Open a cell to
            flag it or leave a note.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            {CHECK_IN_FLAGS.map((f) => (
              <span
                key={f}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  FLAG_BADGE[f]
                )}
              >
                {FLAG_LABEL[f]}
              </span>
            ))}
          </div>
          <select
            aria-label="Year"
            value={sheet.year}
            onChange={(e) => router.push(`/check-ins?year=${e.target.value}`)}
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-muted-foreground text-sm">
          No people yet. Add them on the Admin page.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/40 border-b">
                <th className="bg-muted sticky left-0 z-10 min-w-44 px-3 py-2 text-left font-medium">
                  Person
                </th>
                {CHECK_IN_MONTHS.map((m) => {
                  const done = sheet.cells.filter(
                    (c) => c.month === m && c.checked
                  ).length;
                  return (
                    <th
                      key={m}
                      className="min-w-24 px-2 py-2 text-left font-medium"
                    >
                      <div>{MONTH_LABEL[m]}</div>
                      <div
                        className={cn(
                          "text-xs font-normal tabular-nums",
                          done === total
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {done}/{total}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sheet.people.map((p) => (
                <tr key={p.email} className="border-b last:border-0">
                  <th
                    scope="row"
                    className="bg-background sticky left-0 z-10 px-3 py-1.5 text-left font-normal"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.team && (
                        <span
                          className={cn(
                            "rounded-full border px-1.5 text-[11px] font-medium",
                            TEAM_BADGE[p.team]
                          )}
                        >
                          {p.team}
                        </span>
                      )}
                    </div>
                  </th>
                  {CHECK_IN_MONTHS.map((m) => (
                    <td key={m} className="px-1 py-1">
                      <CheckInCellView
                        person={p}
                        year={sheet.year}
                        cell={findCell(sheet, p.email, m)}
                        onPatch={(patch) =>
                          update.mutate({
                            profileEmail: p.email,
                            year: sheet.year,
                            month: m,
                            ...patch,
                          })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
