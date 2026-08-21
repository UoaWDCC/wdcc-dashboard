import { Allocation, Applicant, Project } from "./models";
import { config } from "./config";
import { centeredPriority } from "./utils";

const { A, B, C, D, E, F } = config.allocation;

/**
 * Get utility (happiness score) from a certain allocation.
 *
 * @param allocation An allocation of applicants to a single project
 */
export function calculateUtilityOfAllocation(allocation: Allocation): number {
  const { project, applicants } = allocation;
  const n = applicants.length;

  // I need these names to be short for my sanity sorry
  let projectPrefScore = 0; // Overall PROJECT CHOICE satisfaction metric
  let bePrefSum = 0;
  let beExpSum = 0;
  let feExpSum = 0;
  for (const applicant of applicants) {
    projectPrefScore += getApplicantUtilityFromProject(applicant, project);
    bePrefSum += applicant.backendPreference;
    beExpSum += applicant.backendExperience;
    feExpSum += applicant.frontendExperience;
  }

  // Overall ROLE (FE/BE) dissatisfaction metric
  const targetBePrefSum = n * project.backendWeighting;
  const rolePrefDeviation = Math.abs(bePrefSum - targetBePrefSum);
  const rolePrefScore = n * 5 - rolePrefDeviation;

  // Experience level metrics
  const beExpScore = beExpSum * project.backendDifficulty;
  const feExpScore = feExpSum * project.frontendDifficulty;

  // Priority & objective score
  const priorityExpMultiplier = 1 + E * centeredPriority(project);
  const objectiveScore =
    A * projectPrefScore + B * rolePrefScore + priorityExpMultiplier * (C * beExpScore + D * feExpScore);

  return objectiveScore;
}

/** 5 for first choice, 4 for second choice ... 0 for not chosen */
function getApplicantUtilityFromProject(applicant: Applicant, project: Project): number {
  // Special requests
  if (applicant.requestedProject === project.name) {
    return F;
  }

  // Choice rankings
  for (const [i, choice] of applicant.projectChoices.entries()) {
    if (choice === project.name) {
      return 5 - i;
    }
  }
  return 0;
}
