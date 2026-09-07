"use client";

import { useState, type ReactNode } from "react";
import { Check, Download, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  buildCsv,
  teamFileName,
  teamRows,
  toCsvRow,
} from "@/lib/allocation/export";
import { choiceRank, scoreAllocation } from "@/lib/allocation/objective";
import type { AllocationRun, Applicant } from "@/lib/allocation/types";

import { ApplicantsTable } from "./ApplicantsTable";

const PLACES = ["1st", "2nd", "3rd", "4th", "5th"];

function downloadCsv(fileName: string, rows: object[]) {
  const url = URL.createObjectURL(
    new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <X className="text-destructive size-4" />
      )}
      <span className={ok ? "text-muted-foreground" : "font-medium"}>
        {label}
      </span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

function LogSection({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <details className="text-sm">
      <summary className="text-muted-foreground cursor-pointer select-none">
        {title} ({lines.length})
      </summary>
      <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 text-xs whitespace-pre-wrap">
        {lines.join("\n")}
      </pre>
    </details>
  );
}

export function AllocationResults({
  run,
  pool,
  designers,
  flagged,
}: {
  run: AllocationRun;
  pool: Applicant[];
  designers: Applicant[];
  flagged: Applicant[];
}) {
  const [selected, setSelected] = useState(run.teams[0]?.project.name ?? "");

  const team =
    run.teams.find((t) => t.project.name === selected) ?? run.teams[0];
  const allocated = run.teams.reduce((sum, t) => sum + t.applicants.length, 0);
  const sizes = run.teams.map((t) => t.applicants.length);
  const rankOf = (applicant: Applicant) =>
    choiceRank(applicant, team.project.name);

  const score = scoreAllocation(team);
  const n = team.applicants.length;
  const places = PLACES.map(
    (_, index) => team.applicants.filter((a) => rankOf(a) === 5 - index).length
  );
  const unchosen = team.applicants.filter((a) => rankOf(a) === 0).length;

  const allocatedIds = run.teams.flatMap((t) => t.applicants.map((a) => a.id));
  const duplicates = allocatedIds.length - new Set(allocatedIds).size;
  const accountedFor = new Set(allocatedIds).size + run.unmatched.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Allocated" value={allocated} />
        <Stat label="Teams" value={run.teams.length} />
        <Stat
          label="Team sizes"
          value={`${Math.min(...sizes)}–${Math.max(...sizes)}`}
        />
        <Stat label="Total utility" value={run.totalUtility.toFixed(2)} />
        <Stat
          label="Per applicant"
          value={(run.totalUtility / allocated).toFixed(2)}
        />
        <Stat
          label="Random baseline"
          value={`${run.baselineUtility.toFixed(2)} (${(run.baselineUtility / allocated).toFixed(2)}/ea)`}
        />
      </div>

      <Separator />

      <div className="space-y-4">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-full sm:w-[32rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {run.teams.map((t) => (
              <SelectItem key={t.project.name} value={t.project.name}>
                {t.project.name} ({t.applicants.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Objective" value={score.objectiveScore.toFixed(2)} />
          <Stat
            label="Project pref"
            value={`${score.projectPrefScore}/${n * 5}`}
          />
          <Stat
            label="Role pref"
            value={`${score.rolePrefScore}/${n * 5} (want ${score.targetBePrefSum}, got ${score.bePrefSum})`}
          />
          <Stat label="BE exp" value={`${score.beExpScore}/${n * 25}`} />
          <Stat label="FE exp" value={`${score.feExpScore}/${n * 25}`} />
          <Stat
            label="Can cover"
            value={`${score.designers} design · ${score.backenders} BE · ${score.frontenders} FE`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PLACES.map((place, index) => (
            <Badge key={place} variant="secondary">
              {place} choice: {places[index]}
            </Badge>
          ))}
          <Badge variant={unchosen > 0 ? "destructive" : "outline"}>
            Not chosen: {unchosen}
          </Badge>
        </div>

        {/* Keyed so switching team resets the sort: useSortableRows caches the
            getValue closure, which for the Choice column is team-specific. */}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCsv(
              teamFileName(team.project.name),
              team.applicants.map(toCsvRow)
            )
          }
        >
          <Download /> Download this team
        </Button>

        <ApplicantsTable
          key={team.project.name}
          applicants={team.applicants}
          choiceRankFor={rankOf}
        />
      </div>

      {run.unmatched.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Unmatched ({run.unmatched.length})
            </h3>
            <p className="text-muted-foreground text-sm">
              Every one of their five choices filled up. They are in no team and
              need placing by hand.
            </p>
            <ul className="space-y-1 text-sm">
              {run.unmatched.map((applicant) => (
                <li key={applicant.id}>
                  <span className="font-medium">{applicant.name}</span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {applicant.projectChoices.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Downloads</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "allocation-all-teams.csv",
                run.teams.flatMap(teamRows)
              )
            }
          >
            <Download /> All teams ({allocatedIds.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={run.unmatched.length === 0}
            onClick={() =>
              downloadCsv("unmatched.csv", run.unmatched.map(toCsvRow))
            }
          >
            <Download /> Unmatched ({run.unmatched.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={designers.length === 0}
            onClick={() =>
              downloadCsv("designers.csv", designers.map(toCsvRow))
            }
          >
            <Download /> Designers ({designers.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={flagged.length === 0}
            onClick={() =>
              downloadCsv("flaggedApplicants.csv", flagged.map(toCsvRow))
            }
          >
            <Download /> Flagged ({flagged.length})
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Checks</h3>
        <ul className="space-y-1">
          <CheckRow
            ok={duplicates === 0}
            label={
              duplicates === 0
                ? "No applicant appears in more than one team"
                : `${duplicates} applicants appear in more than one team`
            }
          />
          <CheckRow
            ok={accountedFor === pool.length}
            label={
              accountedFor === pool.length
                ? `All ${pool.length} pool applicants accounted for (${allocatedIds.length} allocated, ${run.unmatched.length} unmatched)`
                : `${pool.length - accountedFor} pool applicants are missing from the output`
            }
          />
          <CheckRow
            ok={run.warnings.length === 0}
            label={
              run.warnings.length === 0
                ? "Everyone is in a project they chose"
                : `${run.warnings.length} applicants are in a project they did not choose`
            }
          />
        </ul>
        <LogSection title="Redistribution log" lines={run.redistributionLog} />
        <LogSection title="Warnings" lines={run.warnings} />
      </div>
    </div>
  );
}
