import { Allocation, Applicant, Project } from "./models";

/** Midpoint of the 1-5 Likert scales the project form uses. */
const NEUTRAL = 3;

/** Backend share of a team, as a fraction: weighting 1 (all frontend) -> 0, 5 (all backend) -> 1. */
export function backendFraction(project: Project): number {
  return (project.backendWeighting - 1) / 4;
}

/** Priority re-centred so 0 means "no preference", negative favours beginners, positive experience. */
export function centeredPriority(project: Project): number {
  return project.priority - NEUTRAL;
}

/** Applicant's backend leaning as a fraction, on the same 0-1 footing as backendFraction. */
export function applicantBackendFraction(applicant: Applicant): number {
  return (applicant.backendPreference - 1) / 4;
}

/** Helper method to loop through and sum all the applicants in a set of allocations */
export function countAllApplicants(allocations: Allocation[]): number {
  let count = 0;
  for (const allocation of allocations) {
    count += allocation.applicants.length;
  }
  return count;
}
