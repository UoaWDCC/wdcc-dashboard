import { Allocation, Applicant, Project } from "./models";
import { powerOfFriendship } from "./powerOfFriendship";
import { countAllApplicants } from "./utils";

export type ProjectSummary = {
  projectId: number;
  projectName: string;
  count: number;
  /** buckets[0] = no preferred project, buckets[1..5] = applicants who ranked this project 1st..5th */
  buckets: { rank: number; applicants: Applicant[] }[];
};

export type AllocationResult = {
  allocations: Allocation[];
  projectSummaries: ProjectSummary[];
  numApplicants: number;
};

/** Sanitizes a project name for use as a file name. */
export function safeProjectName(name: string): string {
  return name.replace(/[\\/:.]/g, "_");
}

export function summarizeProject(allocation: Allocation): ProjectSummary {
  const buckets: { rank: number; applicants: Applicant[] }[] = [0, 1, 2, 3, 4, 5].map((rank) => ({
    rank,
    applicants: [],
  }));
  for (const applicant of allocation.applicants) {
    const index = applicant.projectChoices.indexOf(allocation.project.name);
    const rank = index >= 0 && index < 5 ? index + 1 : 0;
    buckets[rank].applicants.push(applicant);
  }
  return {
    projectId: allocation.project.id,
    projectName: allocation.project.name,
    count: allocation.applicants.length,
    buckets,
  };
}

/** Runs the full allocation (Gale-Shapley seed + heuristic ascent). */
export function runAllocation(applicants: Applicant[], projects: Project[]): AllocationResult {
  const allocations = powerOfFriendship(applicants, projects);
  return {
    allocations,
    projectSummaries: allocations.map(summarizeProject),
    numApplicants: countAllApplicants(allocations),
  };
}
