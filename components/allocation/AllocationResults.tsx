"use client";

import { useState, type ReactNode } from "react";
import { Check, Download, Info, X } from "lucide-react";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildCsv,
  teamFileName,
  teamRows,
  toCsvRow,
} from "@/lib/allocation/export";
import { choiceRank, scoreAllocation } from "@/lib/allocation/objective";
import type { AllocationRun, Applicant } from "@/lib/allocation/types";
import { cn } from "@/lib/utils";

import { ApplicantsTable } from "./ApplicantsTable";

const PLACES = ["1st", "2nd", "3rd", "4th", "5th"];

type Tone = "good" | "warn" | "bad" | "neutral";

const TONE: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-500",
  bad: "text-destructive",
  neutral: "",
};

// Cut-offs are set from the spread actually seen across the teams, so they pick
// out the handful worth a second look rather than colouring everything.
const topChoiceTone = (percent: number): Tone =>
  percent >= 80 ? "good" : percent >= 65 ? "warn" : "bad";
/** How far the team's average front/back leaning sits from what the lead asked for. */
const mixTone = (gap: number): Tone =>
  gap <= 0.5 ? "good" : gap <= 1 ? "warn" : "bad";
/** How far average experience sits below the difficulty the lead rated the work. */
const experienceTone = (shortfall: number): Tone =>
  shortfall <= 0.5 ? "good" : shortfall <= 1 ? "warn" : "bad";
const coverTone = (people: number): Tone =>
  people === 0 ? "bad" : people <= 2 ? "warn" : "good";
const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`;

function downloadCsv(fileName: string, rows: object[]) {
  const url = URL.createObjectURL(
    new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8;" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  // The anchor has to be in the document for the click to count as user-initiated
  // in Firefox and Safari, and the object URL has to outlive the click, since
  // revoking it synchronously cancels the download.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: Tone;
}) {
  return (
    <div className="space-y-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground flex w-fit cursor-help items-center gap-1 text-xs">
            {label}
            <Info className="size-3 opacity-60" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-pretty">{hint}</TooltipContent>
      </Tooltip>
      <div className={cn("text-sm font-medium tabular-nums", TONE[tone])}>
        {value}
      </div>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className={cn("size-4 shrink-0", TONE.good)} />
      ) : (
        <X className="text-destructive size-4 shrink-0" />
      )}
      <span className={ok ? "text-muted-foreground" : "font-medium"}>
        {label}
      </span>
    </li>
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
  const allocatedIds = run.teams.flatMap((t) => t.applicants.map((a) => a.id));
  const allocated = allocatedIds.length;
  const sizes = run.teams.map((t) => t.applicants.length);
  const rankOf = (applicant: Applicant) =>
    choiceRank(applicant, team.project.name);

  const topTwoOverall = run.teams.flatMap((t) =>
    t.applicants.filter((a) => choiceRank(a, t.project.name) >= 4)
  ).length;
  const topTwoPercent = (topTwoOverall / allocated) * 100;
  const vsRandom = (run.totalUtility / run.baselineUtility - 1) * 100;
  const sizeSpread = Math.max(...sizes) - Math.min(...sizes);

  const score = scoreAllocation(team);
  const n = team.applicants.length;
  const places = PLACES.map(
    (_, index) => team.applicants.filter((a) => rankOf(a) === 5 - index).length
  );
  const unchosen = team.applicants.filter((a) => rankOf(a) === 0).length;

  const teamTopTwo = places[0] + places[1];
  const teamTopTwoPercent = (teamTopTwo / n) * 100;
  const wantedMix = team.project.backendWeighting;
  const actualMix = score.bePrefSum / n;
  const beAvg = score.beExpSum / n;
  const feAvg = score.feExpSum / n;

  const duplicates = allocated - new Set(allocatedIds).size;
  const accountedFor = new Set(allocatedIds).size + run.unmatched.length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Metric
            label="Placed"
            value={`${allocated} of ${pool.length}`}
            tone={run.unmatched.length === 0 ? "good" : "warn"}
            hint="How many people got a team. Anyone left over picked five projects that all filled up, so you need to place them yourself."
          />
          <Metric
            label="Teams"
            value={run.teams.length}
            hint="One team for each project in the project preferences form."
          />
          <Metric
            label="Team sizes"
            value={`${Math.min(...sizes)}-${Math.max(...sizes)}`}
            tone={sizeSpread <= 2 ? "good" : "warn"}
            hint="The smallest and largest team. Teams are filled evenly, then the small ones are topped up. If the gap is bigger than two, check why."
          />
          <Metric
            label="Got 1st or 2nd pick"
            value={`${topTwoPercent.toFixed(0)}%`}
            tone={topChoiceTone(topTwoPercent)}
            hint="How many people got one of their top two picks. This is the main number to look at. Over 80% is a good result."
          />
          <Metric
            label="Better than random"
            value={`+${vsRandom.toFixed(0)}%`}
            tone={vsRandom > 0 ? "good" : "bad"}
            hint={`How much better this is than handing out places at random. The raw score (${run.totalUtility.toFixed(0)}) means nothing by itself, so we compare the two.`}
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Metric
              label="Got 1st or 2nd pick"
              value={`${teamTopTwoPercent.toFixed(0)}% (${teamTopTwo} of ${n})`}
              tone={topChoiceTone(teamTopTwoPercent)}
              hint="How many people in this team asked for this project first or second. A low number usually just means a busier project pushed them down their list."
            />
            <Metric
              label="Front/back mix"
              value={`wants ${wantedMix}, got ${actualMix.toFixed(1)}`}
              tone={mixTone(Math.abs(actualMix - wantedMix))}
              hint="What the project lead asked for, next to what this team actually leans towards. 1 means all front end, 5 means all back end. A gap bigger than 1 means the team leans the wrong way for the work."
            />
            <Metric
              label="Back-end experience"
              value={`${beAvg.toFixed(1)} avg, needs ${team.project.backendDifficulty}`}
              tone={experienceTone(team.project.backendDifficulty - beAvg)}
              hint="The team average for back-end experience, next to how hard the lead said the back-end work is. Both are rated 1 to 5. Sitting well below means the work may be a stretch."
            />
            <Metric
              label="Front-end experience"
              value={`${feAvg.toFixed(1)} avg, needs ${team.project.frontendDifficulty}`}
              tone={experienceTone(team.project.frontendDifficulty - feAvg)}
              hint="The team average for front-end experience, next to how hard the lead said the front-end work is. Both are rated 1 to 5."
            />
            <Metric
              label="Can lead back end"
              value={people(score.backenders)}
              tone={coverTone(score.backenders)}
              hint="How many people could take the lead on back-end work, going by their experience and what they said they want to do. Zero is a problem. One or two is thin. A mostly front-end project having few is fine."
            />
            <Metric
              label="Can lead front end"
              value={people(score.frontenders)}
              tone={coverTone(score.frontenders)}
              hint="How many people could take the lead on front-end work, going by their experience and what they said they want to do. Zero is a problem, one or two is thin."
            />
            <Metric
              label="Can do design"
              value={people(score.designers)}
              tone={coverTone(score.designers)}
              hint="How many people have some design experience. Designers are held back and placed separately, so this is just who could help out."
            />
            <Metric
              label="Internal score"
              value={score.objectiveScore.toFixed(0)}
              hint="The score the algorithm tries to push up. Bigger teams score higher, so it only makes sense to compare runs on the same data. You can ignore it."
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
          </div>

          {/* Keyed so switching team resets the sort: useSortableRows caches the
              getValue closure, which for the Choice column is team-specific. */}
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
                Needs placing by hand ({run.unmatched.length})
              </h3>
              <p className="text-muted-foreground text-sm">
                All five projects they picked were full by the time their turn
                came.
              </p>
              <ul className="space-y-1 text-sm">
                {run.unmatched.map((applicant) => (
                  <li key={applicant.id}>
                    <span className="font-medium">{applicant.name}</span>
                    <span className="text-muted-foreground">
                      {": "}
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
              <Download /> All teams ({allocated})
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
            {run.ascentSkipped && (
              <CheckRow
                ok={false}
                label="One project ended up with nobody in it, so the swap step was skipped. These teams come straight from the matching step."
              />
            )}
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
                  ? `All ${pool.length} pool applicants accounted for (${allocated} allocated, ${run.unmatched.length} unmatched)`
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
          <LogSection
            title="Redistribution log"
            lines={run.redistributionLog}
          />
          <LogSection title="Warnings" lines={run.warnings} />
        </div>
      </div>
    </TooltipProvider>
  );
}
