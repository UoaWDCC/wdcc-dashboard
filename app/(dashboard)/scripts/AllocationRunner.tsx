"use client";

import { useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Download, Play, Upload, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { applicantsToCsv, parseProcessedApplicants, parseProjects, parseRawApplicants } from "@/lib/allocation/csv/parse";
import { preprocessApplicants, type PreprocessResult } from "@/lib/allocation/preprocess";
import { runAllocation, safeProjectName, type AllocationResult } from "@/lib/allocation/run";
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

function Results({
  result,
  onDownloadTeam,
  onDownloadAll,
}: {
  result: AllocationResult;
  onDownloadTeam: (index: number) => void;
  onDownloadAll: () => void;
}) {
  // How many applicants landed on each of their choice ranks, across all teams.
  const overall: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const summary of result.projectSummaries) {
    for (const bucket of summary.buckets) overall[bucket.rank] += bucket.applicants.length;
  }
  const topThree = overall[1] + overall[2] + overall[3];
  const topThreePct = Math.round((topThree / result.numApplicants) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        <CardDescription>
          {result.numApplicants} applicants placed across {result.allocations.length} teams.{" "}
          {topThreePct}% got one of their top 3 choices.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {[1, 2, 3, 4, 5, 0]
            .filter((rank) => overall[rank] > 0)
            .map((rank) => (
              <span key={rank} className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
                {rankLabel(rank)}: <span className="font-medium text-foreground">{overall[rank]}</span>
              </span>
            ))}
          <Button size="sm" variant="outline" className="ml-auto" onClick={onDownloadAll}>
            <Download /> Download all teams (zip)
          </Button>
        </div>

        <div className="space-y-3">
          {result.projectSummaries.map((summary, index) => (
            <div key={summary.projectId} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="font-medium">{summary.projectName}</span>
                <Badge variant="outline">{summary.count} members</Badge>
                <Button size="xs" variant="ghost" className="ml-auto" onClick={() => onDownloadTeam(index)}>
                  <Download /> Download
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {summary.buckets
                  .filter((bucket) => bucket.applicants.length > 0)
                  .sort((a, b) => (a.rank === 0 ? 99 : a.rank) - (b.rank === 0 ? 99 : b.rank))
                  .map((bucket) => (
                    <span
                      key={bucket.rank}
                      className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                      title={bucket.applicants.map((a) => a.name).join(", ")}
                    >
                      {rankLabel(bucket.rank)}: <span className="text-foreground">{bucket.applicants.length}</span>
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
