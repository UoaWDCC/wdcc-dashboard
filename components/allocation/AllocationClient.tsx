"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { runAllocation } from "@/lib/allocation/allocate";
import {
  parseApplicantsCsv,
  parseProjectsCsv,
  type ParseResult,
} from "@/lib/allocation/parse";
import type { AllocationRun, Applicant, Project } from "@/lib/allocation/types";

import { AllocationResults } from "./AllocationResults";
import { ApplicantsTable } from "./ApplicantsTable";
import { FileField } from "./FileField";
import { ProjectsTable } from "./ProjectsTable";

async function readCsv<T>(
  file: File,
  parse: (content: string) => ParseResult<T>,
  label: string
): Promise<ParseResult<T> | null> {
  try {
    const result = parse(await file.text());
    if (result.rows.length === 0)
      throw new Error(`No ${label} found in this file.`);
    return result;
  } catch (e) {
    toast.error(
      `Could not read the ${label} file: ${e instanceof Error ? e.message : String(e)}`
    );
    return null;
  }
}

// Held back for exec review. A blank blurb is not flagged — only a short one is,
// so someone who skipped the question still goes through to allocation.
const isFlagged = (applicant: Applicant) =>
  applicant.passionBlurb.length > 0 && applicant.passionBlurb.length < 100;

export function AllocationClient() {
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [applicantsFileName, setApplicantsFileName] = useState<string | null>(
    null
  );
  const [applicantsSkipped, setApplicantsSkipped] = useState(0);
  const [applicantsWarnings, setApplicantsWarnings] = useState(0);

  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsFileName, setProjectsFileName] = useState<string | null>(null);
  const [projectsSkipped, setProjectsSkipped] = useState(0);
  const [projectsWarnings, setProjectsWarnings] = useState(0);

  const [result, setResult] = useState<AllocationRun | null>(null);
  const [running, setRunning] = useState(false);

  async function handleApplicants(file: File) {
    const result = await readCsv(file, parseApplicantsCsv, "applicants");
    if (!result) return;
    setApplicants(result.rows);
    setApplicantsSkipped(result.skipped);
    setApplicantsWarnings(result.warnings);
    setApplicantsFileName(file.name);
    setResult(null);
  }

  async function handleProjects(file: File) {
    const result = await readCsv(file, parseProjectsCsv, "projects");
    if (!result) return;
    setProjects(result.rows);
    setProjectsSkipped(result.skipped);
    setProjectsWarnings(result.warnings);
    setProjectsFileName(file.name);
    setResult(null);
  }

  const designers =
    applicants?.filter((a) => a.rolePreference === "Designer") ?? [];
  const flagged = applicants?.filter(isFlagged) ?? [];
  const pool =
    applicants?.filter(
      (a) => !isFlagged(a) && a.rolePreference !== "Designer"
    ) ?? [];

  function handleRun() {
    if (!projects) return;
    setRunning(true);
    // Deferred so the pending state paints before the solve blocks the main
    // thread for a few hundred milliseconds.
    setTimeout(() => {
      try {
        setResult(runAllocation(pool, projects));
      } catch (e) {
        toast.error(
          `Could not allocate: ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        setRunning(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Applicants</CardTitle>
          <CardDescription>
            Upload the &ldquo;Projects Member Application Form&rdquo; responses
            export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileField
            label="Applicant responses (CSV)"
            fileName={applicantsFileName}
            onFile={handleApplicants}
          />
          {applicants && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{applicants.length} applicants</Badge>
              <Badge variant="secondary">{pool.length} pool</Badge>
              <Badge variant="secondary">{designers.length} designers</Badge>
              <Badge variant="secondary">{flagged.length} flagged</Badge>
              {applicantsSkipped > 0 && (
                <Badge variant="outline">
                  {applicantsSkipped} rows skipped (missing name/email)
                </Badge>
              )}
              {applicantsWarnings > 0 && (
                <Badge variant="outline">
                  {applicantsWarnings} rows may be misread — check for stray
                  quotes in a text answer
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Upload the &ldquo;Project Lead Interview Preferences&rdquo;
            responses export.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileField
            label="Project preferences (CSV)"
            fileName={projectsFileName}
            onFile={handleProjects}
          />
          {projects && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{projects.length} projects</Badge>
              {projectsSkipped > 0 && (
                <Badge variant="outline">
                  {projectsSkipped} rows skipped (missing name)
                </Badge>
              )}
              {projectsWarnings > 0 && (
                <Badge variant="outline">
                  {projectsWarnings} rows may be misread — check for stray
                  quotes in a text answer
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(applicants || projects) && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="pool">
              <TabsList>
                <TabsTrigger value="pool">Pool ({pool.length})</TabsTrigger>
                <TabsTrigger value="designers">
                  Designers ({designers.length})
                </TabsTrigger>
                <TabsTrigger value="flagged">
                  Flagged ({flagged.length})
                </TabsTrigger>
                <TabsTrigger value="projects">
                  Projects ({projects?.length ?? 0})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="pool">
                <ApplicantsTable applicants={pool} />
              </TabsContent>
              <TabsContent value="designers">
                <ApplicantsTable applicants={designers} />
              </TabsContent>
              <TabsContent value="flagged">
                <ApplicantsTable applicants={flagged} />
              </TabsContent>
              <TabsContent value="projects">
                <ProjectsTable projects={projects ?? []} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {applicants && projects && (
        <Card>
          <CardHeader>
            <CardTitle>Allocation</CardTitle>
            <CardDescription>
              Sorts the {pool.length} pool applicants into {projects.length}{" "}
              teams. Designers and flagged applicants are held back.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button onClick={handleRun} disabled={running}>
              <Play /> {running ? "Allocating…" : "Run allocation"}
            </Button>
            {result && (
              <AllocationResults
                run={result}
                pool={pool}
                designers={designers}
                flagged={flagged}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
