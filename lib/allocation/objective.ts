import { Allocation, Applicant, Project } from "./models";
import { config } from "./config";

const { A, B, C, D, E, F } = config.allocation;

/**
 * Get utility (happiness score) from a certain allocation.
 *
 * @param allocation An allocation of applicants to a single project
 */
export function calculateUtilityOfAllocation(allocation: Allocation, log: boolean = false): number {
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
  const priorityExpMultiplier = 1 + E * project.priority;
  const objectiveScore =
    A * projectPrefScore + B * rolePrefScore + priorityExpMultiplier * (C * beExpScore + D * feExpScore);

  // Logging (bit of a hack...)
  if (log) {
    console.log(`  Proj pref: ${projectPrefScore.toFixed(2)}/${n * 5}`);
    console.log(
      `  Role pref: ${rolePrefScore.toFixed(2)}/${n * 5}    (target: ${targetBePrefSum} sum: ${bePrefSum})`
    );
    console.log(`  BE exp:    ${beExpScore.toFixed(2)}/${n * 25}    (${beExpSum} * ${project.backendDifficulty})`);
    console.log(`  FE exp:    ${feExpScore.toFixed(2)}/${n * 25}    (${feExpSum} * ${project.frontendDifficulty})`);
    console.log(
      `  Objective: ${objectiveScore.toFixed(2)}       ${A} * ${projectPrefScore} + ${B} * ${rolePrefScore} + ${priorityExpMultiplier}(${C} * ${beExpScore} + ${D} * ${feExpScore})`
    );

    // Sanity check just to ensure there are people who COULD do each role in each team (will be duplicates)
    let numFrontend = 0;
    let numBackend = 0;
    let numDesign = 0;
    for (const applicant of applicants) {
      if (applicant.designExperience >= 3) numDesign++;
      if (applicant.backendExperience * applicant.backendPreference >= 10) numBackend++;
      if (applicant.frontendExperience * (6 - applicant.backendPreference) >= 10) numFrontend++;
    }
    console.log(`  Designers: ${numDesign} | Backenders: ${numBackend} | Frontenders: ${numFrontend}`);
  }

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
