import type { Applicant, TeamAllocation, TeamScore } from "./types";

// Ported from projects-allocation-script (config/scriptConfig.ts). Project.priority
// is that script's Project.experienceWeighting; the two experienceWeighting names
// there are unrelated quantities.
export const ALLOCATION_WEIGHTS = {
  projectPreference: 1,
  rolePreference: 0.5,
  backendExperience: 1.1,
  frontendExperience: 1.1,
  experienceWeighting: 0.1,
};

export const NUM_ASCENTS = 5;

const {
  projectPreference: projectPrefWeight,
  rolePreference: rolePrefWeight,
  backendExperience: beExpWeight,
  frontendExperience: feExpWeight,
  experienceWeighting: priorityWeight,
} = ALLOCATION_WEIGHTS;

/** 5 for a first choice, 4 for a second … 1 for a fifth, 0 if the project was not chosen. */
export function choiceRank(applicant: Applicant, projectName: string): number {
  for (const [index, choice] of applicant.projectChoices.entries()) {
    if (choice === projectName) return 5 - index;
  }
  return 0;
}

// Float ordering here decides which ascent run wins by ~1e-14, so the
// objectiveScore expression must stay shaped exactly as the script wrote it.
export function scoreAllocation(allocation: TeamAllocation): TeamScore {
  const { project, applicants } = allocation;
  const n = applicants.length;

  let projectPrefScore = 0;
  let bePrefSum = 0;
  let beExpSum = 0;
  let feExpSum = 0;
  let designers = 0;
  let backenders = 0;
  let frontenders = 0;
  for (const applicant of applicants) {
    projectPrefScore += choiceRank(applicant, project.name);
    bePrefSum += applicant.backendPreference;
    beExpSum += applicant.backendExperience;
    feExpSum += applicant.frontendExperience;
    if (applicant.designExperience >= 3) designers++;
    if (applicant.backendExperience * applicant.backendPreference >= 10)
      backenders++;
    if (applicant.frontendExperience * (6 - applicant.backendPreference) >= 10)
      frontenders++;
  }

  const targetBePrefSum = n * project.backendWeighting;
  const rolePrefDeviation = Math.abs(bePrefSum - targetBePrefSum);
  const rolePrefScore = n * 5 - rolePrefDeviation;

  const beExpScore = beExpSum * project.backendDifficulty;
  const feExpScore = feExpSum * project.frontendDifficulty;

  const priorityExpMultiplier = 1 + priorityWeight * project.priority;
  const objectiveScore =
    projectPrefWeight * projectPrefScore +
    rolePrefWeight * rolePrefScore +
    priorityExpMultiplier *
      (beExpWeight * beExpScore + feExpWeight * feExpScore);

  return {
    objectiveScore,
    projectPrefScore,
    rolePrefScore,
    beExpScore,
    feExpScore,
    beExpSum,
    feExpSum,
    bePrefSum,
    targetBePrefSum,
    designers,
    backenders,
    frontenders,
  };
}

export function calculateTotalUtility(teams: TeamAllocation[]): number {
  return teams
    .map((team) => scoreAllocation(team).objectiveScore)
    .reduce((sum, utility) => sum + utility, 0);
}
