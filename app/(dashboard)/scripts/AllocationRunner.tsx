"use client";

import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, Play, Upload, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { applicantsToCsv, parseProcessedApplicants, parseProjects, parseRawApplicants } from "@/lib/allocation/csv/parse";
import { preprocessApplicants, type PreprocessResult } from "@/lib/allocation/preprocess";
import { runAllocation, safeProjectName, type AllocationResult } from "@/lib/allocation/run";
import type { AllocationMetrics, TeamMetrics } from "@/lib/allocation/metrics";
import type { Applicant, Project } from "@/lib/allocation/models";

function download(fileName: string, content: string | Blob) {
  const blob = typeof content === "string" ? new Blob([content], { type: "text/csv;charset=utf-8" }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

type ApplicantSource = "preprocessed" | "uploaded";

export function AllocationRunner() {
  const [preprocess, setPreprocess] = useState<PreprocessResult | null>(null);
  const [rawFileName, setRawFileName] = useState<string | null>(null);

  const [uploadedProcessed, setUploadedProcessed] = useState<Applicant[] | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string | null>(null);
  const [source, setSource] = useState<ApplicantSource>("preprocessed");

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsFileName, setProjectsFileName] = useState<string | null>(null);

  const [result, setResult] = useState<AllocationResult | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRaw(file: File) {
    try {
      const applicants = parseRawApplicants(await file.text());
      if (applicants.length === 0) throw new Error("No applicants found in CSV.");
      setPreprocess(preprocessApplicants(applicants));
      setRawFileName(file.name);
      setSource("preprocessed");
    } catch (e) {
      toast.error(`Could not read the applications file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleProcessed(file: File) {
    try {
      const applicants = parseProcessedApplicants(await file.text());
      if (applicants.length === 0) throw new Error("No applicants found in CSV.");
      setUploadedProcessed(applicants);
      setProcessedFileName(file.name);
      setSource("uploaded");
    } catch (e) {
      toast.error(`Could not read the applicants list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleProjects(file: File) {
    try {
      const parsed = parseProjects(await file.text());
      if (parsed.length === 0) throw new Error("No projects found in CSV.");
      setProjects(parsed);
      setProjectsFileName(file.name);
    } catch (e) {
      toast.error(`Could not read the projects file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const applicants = source === "preprocessed" ? (preprocess?.processed ?? null) : uploadedProcessed;
  const canRun = !!applicants && applicants.length > 0 && !!projects && projects.length > 0 && !running;

  async function run() {
    if (!applicants || !projects) return;
    setRunning(true);
    // Yield so the UI can paint the running state before the blocking compute.
    await new Promise((r) => setTimeout(r, 20));
    try {
      setResult(runAllocation(applicants, projects));
    } catch (e) {
      toast.error(`Could not sort into teams: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  }

  function downloadTeam(index: number) {
    if (!result) return;
    const allocation = result.allocations[index];
    download(`applicants-${safeProjectName(allocation.project.name)}.csv`, applicantsToCsv(allocation.applicants));
  }

  async function downloadAll() {
    if (!result) return;
    const zip = new JSZip();
    for (const allocation of result.allocations) {
      zip.file(`applicants-${safeProjectName(allocation.project.name)}.csv`, applicantsToCsv(allocation.applicants));
    }
    download("allocations.zip", await zip.generateAsync({ type: "blob" }));
  }

  return (
    <div className="space-y-6">
      {/* Stage 1 — preprocess */}
      <Card>
        <CardHeader>
          <CardTitle>1. Prepare applications</CardTitle>
          <CardDescription>
            Upload the application form responses. Designers are set aside for a separate process, and
            incomplete applications are flagged for you to review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileField label="Application responses (CSV)" fileName={rawFileName} onFile={handleRaw} />
          {preprocess && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{preprocess.processed.length} ready to place</Badge>
              <Badge variant="secondary">{preprocess.designers.length} designers</Badge>
              <Badge variant="secondary">{preprocess.flagged.length} to review</Badge>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download("applicants-ready.csv", applicantsToCsv(preprocess.processed))}
                >
                  <Download /> Ready list
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download("designers.csv", applicantsToCsv(preprocess.designers))}
                >
                  <Download /> Designers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => download("applicants-to-review.csv", applicantsToCsv(preprocess.flagged))}
                >
                  <Download /> To review
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage 2 — allocate */}
      <Card>
        <CardHeader>
          <CardTitle>2. Sort into teams</CardTitle>
          <CardDescription>
            Upload the projects list, then place applicants into teams based on their choices and experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Who to place</div>
            <div className="flex flex-wrap gap-2">
              <SourceToggle
                active={source === "preprocessed"}
                disabled={!preprocess}
                onClick={() => setSource("preprocessed")}
                label={
                  preprocess ? `Ready list from step 1 (${preprocess.processed.length})` : "Ready list (do step 1 first)"
                }
              />
              <SourceToggle
                active={source === "uploaded"}
                onClick={() => setSource("uploaded")}
                label={uploadedProcessed ? `Uploaded list (${uploadedProcessed.length})` : "Upload a list instead"}
              />
            </div>
            {source === "uploaded" && (
              <FileField label="Applicants list (CSV)" fileName={processedFileName} onFile={handleProcessed} />
            )}
          </div>

          <FileField label="Projects list (CSV)" fileName={projectsFileName} onFile={handleProjects} />

          <div className="flex items-center gap-3">
            <Button onClick={run} disabled={!canRun}>
              <Play /> {running ? "Sorting…" : result ? "Run again" : "Sort into teams"}
            </Button>
            {result && (
              <span className="text-xs text-muted-foreground">Same files always produce the same teams.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {result && <Results result={result} onDownloadTeam={downloadTeam} onDownloadAll={downloadAll} />}
    </div>
  );
}

function FileField({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName: string | null;
  onFile: (file: File) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Upload className="size-4 text-muted-foreground" />
        <Input
          type="file"
          accept=".csv,text/csv"
          className="cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </div>
      {fileName && <span className="text-xs text-muted-foreground">Loaded: {fileName}</span>}
    </label>
  );
}

function SourceToggle({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "outline"}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(active && "ring-1 ring-foreground/20")}
    >
      {label}
    </Button>
  );
}

const RANK_LABELS: Record<number, string> = {
  1: "1st choice",
  2: "2nd choice",
  3: "3rd choice",
  4: "4th choice",
  5: "5th choice",
};

function rankLabel(rank: number): string {
  return rank === 0 ? "No preferred project" : RANK_LABELS[rank];
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`;
const oneDp = (value: number) => value.toFixed(1);

/**
 * Ordinal ramp, not a categorical one: the green family means the applicant got a project
 * high on their list, orange means they fell down it, grey means they got nothing they picked.
 */
const RANK_COLOR: Record<number, string> = {
  1: "var(--brand-green)",
  2: "color-mix(in srgb, var(--brand-green) 68%, var(--card))",
  3: "color-mix(in srgb, var(--brand-green) 40%, var(--card))",
  4: "color-mix(in srgb, var(--brand-orange) 52%, var(--card))",
  5: "var(--brand-orange)",
  0: "color-mix(in srgb, var(--muted-foreground) 32%, var(--card))",
};

const RANK_ORDER = [1, 2, 3, 4, 5, 0];

// The raw brand colours are fine as fills but too light for text on a white card, so text
// mixes toward the foreground — which also lightens them correctly in dark mode.
const ATTENTION_TEXT = "color-mix(in srgb, var(--brand-orange) 68%, var(--foreground))";
const GOOD_TEXT = "color-mix(in srgb, var(--brand-green) 72%, var(--foreground))";

function ribbonLabel(counts: Record<number, number>): string {
  return RANK_ORDER.filter((rank) => counts[rank] > 0)
    .map((rank) => `${counts[rank]} ${rankLabel(rank).toLowerCase()}`)
    .join(", ");
}

/** Stacked bar of choice ranks — the same encoding for the whole cohort and for each team. */
function SatisfactionRibbon({
  counts,
  total,
  height = "h-2.5",
}: {
  counts: Record<number, number>;
  total: number;
  height?: string;
}) {
  if (total === 0) return null;
  return (
    <div
      role="img"
      aria-label={ribbonLabel(counts)}
      className={cn("flex w-full overflow-hidden rounded-full bg-muted", height)}
    >
      {RANK_ORDER.filter((rank) => counts[rank] > 0).map((rank) => (
        <div
          key={rank}
          title={`${rankLabel(rank)}: ${counts[rank]}`}
          style={{ width: `${(counts[rank] / total) * 100}%`, background: RANK_COLOR[rank] }}
        />
      ))}
    </div>
  );
}

function RibbonLegend({ counts }: { counts: Record<number, number> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {RANK_ORDER.filter((rank) => counts[rank] > 0).map((rank) => (
        <span key={rank} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ background: RANK_COLOR[rank] }} />
          {rankLabel(rank)}
          <span className="font-medium tabular-nums text-foreground">{counts[rank]}</span>
        </span>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "good" | "attention";
}) {
  const valueColor = tone === "good" ? GOOD_TEXT : tone === "attention" ? ATTENTION_TEXT : undefined;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className="mt-1.5 font-heading text-3xl font-semibold tabular-nums leading-none"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Checks({ metrics }: { metrics: AllocationMetrics }) {
  const passed = metrics.warnings.length === 0;
  const accent = passed ? "var(--brand-green)" : "var(--brand-orange)";
  const accentText = passed ? GOOD_TEXT : ATTENTION_TEXT;

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 35%, var(--border))`,
        background: `color-mix(in srgb, ${accent} 7%, var(--card))`,
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: accentText }}>
        {passed ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
        {passed
          ? "All checks passed"
          : `${metrics.warnings.length} thing${metrics.warnings.length === 1 ? "" : "s"} to check`}
      </div>
      {passed ? (
        <p className="mt-1.5 text-sm text-muted-foreground">
          Everyone was placed exactly once, every team has people who can cover both back-end and front-end, and
          each team matches the balance its lead asked for.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {metrics.warnings.map((warning) => (
            <li key={warning} className="flex gap-2 text-sm text-muted-foreground">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full" style={{ background: accent }} />
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Colours a diagnostic only when it crosses the threshold that makes it worth acting on. */
function Signal({ children, alert }: { children: React.ReactNode; alert: boolean }) {
  return (
    <span
      className={cn("font-medium tabular-nums", !alert && "text-foreground")}
      style={alert ? { color: ATTENTION_TEXT } : undefined}
    >
      {children}
    </span>
  );
}

function TeamRow({ team, onDownload }: { team: TeamMetrics; onDownload: () => void }) {
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const bucket of team.buckets) counts[bucket.rank] = bucket.applicants.length;

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Users className="size-4 shrink-0 text-muted-foreground" />
        <span className="font-medium">{team.projectName}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{team.count} members</span>
        <Button size="xs" variant="ghost" className="ml-auto" onClick={onDownload}>
          <Download /> Download
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <SatisfactionRibbon counts={counts} total={team.count} height="h-2" />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{pct(team.topThreeRate)} top 3</span>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-3">
        <div>
          <dt className="inline">Experience </dt>
          <dd className="inline">
            <Signal alert={false}>{oneDp(team.meanFrontendExperience)}</Signal> front-end ·{" "}
            <Signal alert={false}>{oneDp(team.meanBackendExperience)}</Signal> back-end
          </dd>
        </div>
        <div>
          <dt className="inline">Balance </dt>
          <dd className="inline">
            wanted {oneDp(team.backendWeighting)}, got{" "}
            <Signal alert={team.backendDeviation > 1.5}>{oneDp(team.meanBackendPreference)}</Signal>
          </dd>
        </div>
        <div>
          <dt className="inline">Can cover </dt>
          <dd className="inline">
            <Signal alert={team.capableBackend === 0}>{team.capableBackend}</Signal> back-end ·{" "}
            <Signal alert={team.capableFrontend === 0}>{team.capableFrontend}</Signal> front-end ·{" "}
            <Signal alert={false}>{team.capableDesign}</Signal> design
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Results({
  result,
  onDownloadTeam,
  onDownloadAll,
}: {
  result: AllocationResult;
  onDownloadTeam: (index: number) => void;
  onDownloadAll: () => void;
}) {
  const { metrics } = result;
  const meanSkill = (metrics.meanFrontendExperience + metrics.meanBackendExperience) / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        <CardDescription>
          {metrics.numApplicants} applicants placed across {metrics.numTeams} teams. Teams are deliberately
          oversubscribed — leads narrow them down through interviews.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Checks metrics={metrics} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Got a top 3 choice"
            value={pct(metrics.topThreeRate)}
            hint={`${metrics.choiceCounts[1]} first, ${metrics.choiceCounts[2]} second, ${metrics.choiceCounts[3]} third`}
            tone="good"
          />
          <Stat
            label="Missed their picks"
            value={String(metrics.choiceCounts[0])}
            hint="Placed on a project they did not rank"
            tone={metrics.choiceCounts[0] > 0 ? "attention" : "neutral"}
          />
          <Stat
            label="Average skill"
            value={oneDp(meanSkill)}
            hint={`out of 5 — ${oneDp(metrics.meanFrontendExperience)} front-end, ${oneDp(metrics.meanBackendExperience)} back-end`}
          />
          <Stat
            label="Team size"
            value={
              metrics.smallestTeam === metrics.largestTeam
                ? String(metrics.largestTeam)
                : `${metrics.smallestTeam}–${metrics.largestTeam}`
            }
            hint={`Balance off by ${oneDp(metrics.meanBackendDeviation)} on average`}
          />
        </div>

        <div className="space-y-2.5">
          <SatisfactionRibbon counts={metrics.choiceCounts} total={metrics.numApplicants} height="h-3" />
          <RibbonLegend counts={metrics.choiceCounts} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium">Teams</h3>
            <div className="h-px flex-1 bg-border" />
            <Button size="sm" variant="outline" onClick={onDownloadAll}>
              <Download /> Download all teams (zip)
            </Button>
          </div>
          {metrics.teams.map((team, index) => (
            <TeamRow key={team.projectId} team={team} onDownload={() => onDownloadTeam(index)} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
