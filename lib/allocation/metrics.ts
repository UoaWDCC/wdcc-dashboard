import { Allocation, Applicant } from "./models";

export type ProjectSummary = {
  projectId: number;
  projectName: string;
  count: number;
  /** buckets[0] = no preferred project, buckets[1..5] = applicants who ranked this project 1st..5th */
  buckets: { rank: number; applicants: Applicant[] }[];
};

export type TeamMetrics = ProjectSummary & {
  topThreeRate: number;
  meanFrontendExperience: number;
  meanBackendExperience: number;
  meanDesignExperience: number;
  meanTestingExperience: number;
  /** Team's mean backendPreference against the project's requested weighting (both 1-5). */
  meanBackendPreference: number;
  backendWeighting: number;
  backendDeviation: number;
  priority: number;
  /** Members whose experience/preference combination makes them a plausible pick for each role. */
  capableBackend: number;
  capableFrontend: number;
  capableDesign: number;
};

export type AllocationMetrics = {
  numApplicants: number;
  numTeams: number;
  /** Applicants fed in but never placed, and applicants placed on more than one team. */
  numMissing: number;
  numDuplicated: number;
  /** counts[0] = placed on an unranked project, counts[1..5] = got their 1st..5th choice */
  choiceCounts: Record<number, number>;
  topThreeRate: number;
  meanFrontendExperience: number;
  meanBackendExperience: number;
  meanDesignExperience: number;
  meanTestingExperience: number;
  /** Mean of each team's |mean backendPreference - requested weighting|; lower is better balanced. */
  meanBackendDeviation: number;
  smallestTeam: number;
  largestTeam: number;
  teams: TeamMetrics[];
  warnings: string[];
};

const MIN_DESIGN_EXPERIENCE = 3;
const ROLE_CAPABILITY_THRESHOLD = 10;
/** A team leaning this far from its requested weighting is worth a second look. */
const BACKEND_DEVIATION_WARNING = 1.5;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function canDoBackend(applicant: Applicant): boolean {
  return applicant.backendExperience * applicant.backendPreference >= ROLE_CAPABILITY_THRESHOLD;
}

function canDoFrontend(applicant: Applicant): boolean {
  return applicant.frontendExperience * (6 - applicant.backendPreference) >= ROLE_CAPABILITY_THRESHOLD;
}

function canDoDesign(applicant: Applicant): boolean {
  return applicant.designExperience >= MIN_DESIGN_EXPERIENCE;
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

function teamMetrics(allocation: Allocation): TeamMetrics {
  const summary = summarizeProject(allocation);
  const { applicants, project } = allocation;
  const topThree = summary.buckets[1].applicants.length + summary.buckets[2].applicants.length + summary.buckets[3].applicants.length;
  const meanBackendPreference = mean(applicants.map((a) => a.backendPreference));

  return {
    ...summary,
    topThreeRate: applicants.length === 0 ? 0 : topThree / applicants.length,
    meanFrontendExperience: mean(applicants.map((a) => a.frontendExperience)),
    meanBackendExperience: mean(applicants.map((a) => a.backendExperience)),
    meanDesignExperience: mean(applicants.map((a) => a.designExperience)),
    meanTestingExperience: mean(applicants.map((a) => a.testingExperience)),
    meanBackendPreference,
    backendWeighting: project.backendWeighting,
    backendDeviation: applicants.length === 0 ? 0 : Math.abs(meanBackendPreference - project.backendWeighting),
    priority: project.priority,
    capableBackend: applicants.filter(canDoBackend).length,
    capableFrontend: applicants.filter(canDoFrontend).length,
    capableDesign: applicants.filter(canDoDesign).length,
  };
}

/** Names a handful of teams inline, so one warning per problem beats one warning per team. */
const MAX_NAMED_TEAMS = 4;

function nameList(labels: string[]): string {
  if (labels.length <= MAX_NAMED_TEAMS) return labels.join(", ");
  return `${labels.slice(0, MAX_NAMED_TEAMS).join(", ")} and ${labels.length - MAX_NAMED_TEAMS} more`;
}

function teamsWord(count: number): string {
  return count === 1 ? "1 team" : `${count} teams`;
}

function have(count: number): string {
  return count === 1 ? "has" : "have";
}

function is(count: number): string {
  return count === 1 ? "is" : "are";
}

function collectWarnings(teams: TeamMetrics[], numMissing: number, numDuplicated: number): string[] {
  const warnings: string[] = [];
  if (numMissing > 0) warnings.push(`${numMissing} applicant(s) were not placed on any team.`);
  if (numDuplicated > 0) warnings.push(`${numDuplicated} applicant(s) appear on more than one team.`);

  const staffed = teams.filter((team) => team.count > 0);
  const empty = teams.filter((team) => team.count === 0);
  const noBackend = staffed.filter((team) => team.capableBackend === 0);
  const noFrontend = staffed.filter((team) => team.capableFrontend === 0);
  const offBalance = staffed.filter((team) => team.backendDeviation > BACKEND_DEVIATION_WARNING);

  if (empty.length > 0) {
    warnings.push(
      `${teamsWord(empty.length)} ${have(empty.length)} no members: ${nameList(empty.map((t) => t.projectName))}.`
    );
  }
  if (noBackend.length > 0) {
    warnings.push(
      `${teamsWord(noBackend.length)} ${have(noBackend.length)} nobody suited to backend work: ${nameList(noBackend.map((t) => t.projectName))}.`
    );
  }
  if (noFrontend.length > 0) {
    warnings.push(
      `${teamsWord(noFrontend.length)} ${have(noFrontend.length)} nobody suited to frontend work: ${nameList(noFrontend.map((t) => t.projectName))}.`
    );
  }
  if (offBalance.length > 0) {
    warnings.push(
      `${teamsWord(offBalance.length)} ${is(offBalance.length)} far from the balance their lead asked for: ${nameList(
        offBalance.map((t) => `${t.projectName} (wanted ${t.backendWeighting}, got ${t.meanBackendPreference.toFixed(1)})`)
      )}.`
    );
  }
  return warnings;
}

export function computeAllocationMetrics(allocations: Allocation[], input: Applicant[]): AllocationMetrics {
  const teams = allocations.map(teamMetrics);
  const everyone = allocations.flatMap((allocation) => allocation.applicants);

  const placements = new Map<number, number>();
  for (const applicant of everyone) placements.set(applicant.id, (placements.get(applicant.id) ?? 0) + 1);
  const numMissing = input.filter((applicant) => !placements.has(applicant.id)).length;
  const numDuplicated = [...placements.values()].filter((count) => count > 1).length;

  const choiceCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const team of teams) {
    for (const bucket of team.buckets) choiceCounts[bucket.rank] += bucket.applicants.length;
  }
  const topThree = choiceCounts[1] + choiceCounts[2] + choiceCounts[3];
  const sizes = teams.map((team) => team.count);

  return {
    numApplicants: everyone.length,
    numTeams: teams.length,
    numMissing,
    numDuplicated,
    choiceCounts,
    topThreeRate: everyone.length === 0 ? 0 : topThree / everyone.length,
    meanFrontendExperience: mean(everyone.map((a) => a.frontendExperience)),
    meanBackendExperience: mean(everyone.map((a) => a.backendExperience)),
    meanDesignExperience: mean(everyone.map((a) => a.designExperience)),
    meanTestingExperience: mean(everyone.map((a) => a.testingExperience)),
    meanBackendDeviation: mean(teams.filter((team) => team.count > 0).map((team) => team.backendDeviation)),
    smallestTeam: sizes.length === 0 ? 0 : Math.min(...sizes),
    largestTeam: sizes.length === 0 ? 0 : Math.max(...sizes),
    teams,
    warnings: collectWarnings(teams, numMissing, numDuplicated),
  };
}
