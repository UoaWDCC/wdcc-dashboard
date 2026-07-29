import { Allocation, Applicant, Project } from "./models";
import { computeAllocationMetrics, type AllocationMetrics } from "./metrics";
import { powerOfFriendship } from "./powerOfFriendship";

export type AllocationResult = {
  allocations: Allocation[];
  metrics: AllocationMetrics;
};

/** Sanitizes a project name for use as a file name. */
export function safeProjectName(name: string): string {
  return name.replace(/[\\/:.]/g, "_");
}

/** Runs the full allocation (Gale-Shapley seed + heuristic ascent). */
export function runAllocation(applicants: Applicant[], projects: Project[]): AllocationResult {
  const allocations = powerOfFriendship(applicants, projects);
  return {
    allocations,
    metrics: computeAllocationMetrics(allocations, applicants),
  };
}
