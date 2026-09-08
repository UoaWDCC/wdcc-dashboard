import {
  MinPriorityQueue,
  type IGetCompareValue,
} from "@datastructures-js/priority-queue";

import {
  calculateTotalUtility,
  NUM_ASCENTS,
  scoreAllocation,
} from "./objective";
import type {
  AllocationRun,
  Applicant,
  Project,
  TeamAllocation,
} from "./types";

// Deferred-acceptance matching ported from
// projects-allocation-script/allocation/algorithms/stableMatching.ts.
//
// The comparator below closes over live capacity counters, so the heap is scored
// lazily and its ordering shifts as the run proceeds. Which applicant gets
// evicted depends on the heap's exact array layout, which is why the
// @datastructures-js/priority-queue version is pinned rather than reimplemented.

class ProjectAllocation {
  project: Project;
  allocated: MinPriorityQueue<Applicant>;
  teamSize: number;
  frontAllocated: number;
  backAllocated: number;

  constructor(project: Project, teamSize: number) {
    this.project = project;
    this.allocated = new MinPriorityQueue<Applicant>(contributionOf(this));
    this.teamSize = teamSize;
    this.frontAllocated = 0;
    this.backAllocated = 0;
  }
}

function calculateContribution(
  projectAllocation: ProjectAllocation,
  applicant: Applicant
): number {
  const { project, teamSize, frontAllocated, backAllocated, allocated } =
    projectAllocation;
  const { backendWeighting, priority } = project;
  const { frontendExperience, backendExperience, backendPreference } =
    applicant;

  const remainingFrontendCapacity =
    teamSize * (1 - backendWeighting / 5) - frontAllocated;
  const remainingBackendCapacity =
    teamSize * (backendWeighting / 5) - backAllocated;

  const frontMultiplier = Math.floor(remainingFrontendCapacity);
  const backMultiplier = Math.floor(remainingBackendCapacity);
  const experienceFactor = 2 * (priority - 1.5);

  const skillContribution =
    experienceFactor *
      (frontMultiplier * frontendExperience +
        backMultiplier * backendExperience) +
    backendWeighting * backendPreference;

  // Constant within a queue, so it cancels out of every comparison it takes part
  // in and cannot affect the ordering.
  const balanceContribution = 10 * (teamSize - allocated.size());

  return skillContribution + balanceContribution;
}

function contributionOf(
  projectAllocation: ProjectAllocation
): IGetCompareValue<Applicant> {
  return (applicant) => calculateContribution(projectAllocation, applicant);
}

function updateCapacity(
  allocation: ProjectAllocation,
  applicant: Applicant,
  delta: 1 | -1
): void {
  allocation.frontAllocated += delta * (1 - applicant.backendPreference / 5);
  allocation.backAllocated += (delta * applicant.backendPreference) / 5;
}

/** @returns the target team size it balanced towards */
function redistributeForBalance(
  allocations: ProjectAllocation[],
  applicantChosenProject: Map<number, string>,
  originalPreferences: Map<number, string[]>,
  log: string[]
): number {
  const totalAllocated = allocations.reduce(
    (sum, allocation) => sum + allocation.allocated.size(),
    0
  );
  const targetSize = Math.floor(totalAllocated / allocations.length);

  log.push(`Target team size: ${targetSize}`);

  for (const underfilled of allocations) {
    if (underfilled.allocated.size() >= targetSize) continue;
    if (underfilled.allocated.size() >= underfilled.teamSize) continue;

    // Never decremented as members actually arrive, so every over-target project
    // donates up to this many and a team can overshoot both targetSize and its
    // own capacity. Faithful to the script — correcting it changes the output.
    const needed = Math.min(
      targetSize - underfilled.allocated.size(),
      underfilled.teamSize - underfilled.allocated.size()
    );
    log.push(
      `${underfilled.project.name} needs ${needed} more members (current: ${underfilled.allocated.size()}, capacity: ${underfilled.teamSize})`
    );

    for (const overfilled of allocations) {
      if (overfilled.allocated.size() <= targetSize || needed === 0) continue;

      const excess = overfilled.allocated.size() - targetSize;
      let toMove = Math.min(needed, excess);

      const potentialCandidates = overfilled.allocated.toArray();
      const movingCandidates: Applicant[] = [];

      for (const applicant of potentialCandidates) {
        if (toMove === 0) break;

        const origPrefs = originalPreferences.get(applicant.id) || [];
        if (origPrefs.includes(underfilled.project.name)) {
          movingCandidates.push(applicant);
          toMove--;
        }
      }

      for (const applicant of movingCandidates) {
        // Removing by draining and refilling re-sorts the heap against capacity
        // counters that have not been updated yet. That ordering is observable
        // in the final teams, so this cannot become a remove() call.
        const tempApplicants: Applicant[] = [];
        while (overfilled.allocated.size() > 0) {
          const item = overfilled.allocated.dequeue();
          if (item && item.id !== applicant.id) {
            tempApplicants.push(item);
          }
        }
        for (const item of tempApplicants) {
          overfilled.allocated.enqueue(item);
        }

        updateCapacity(overfilled, applicant, -1);
        underfilled.allocated.enqueue(applicant);
        updateCapacity(underfilled, applicant, 1);
        applicantChosenProject.set(applicant.id, underfilled.project.name);

        log.push(
          `Moved ${applicant.name} from ${overfilled.project.name} to ${underfilled.project.name}`
        );
      }
    }
  }

  for (const allocation of allocations) {
    log.push(
      `${allocation.project.name}: ${allocation.allocated.size()}/${allocation.teamSize} members`
    );
  }

  return targetSize;
}

type StableMatchingResult = {
  teams: TeamAllocation[];
  unmatched: Applicant[];
  teamSize: number;
  targetSize: number;
  redistributionLog: string[];
  warnings: string[];
};

export function stableMatching(
  applicants: Applicant[],
  projects: Project[]
): StableMatchingResult {
  const projectTeamSize = Math.floor(applicants.length / projects.length) + 1;
  const allocationResult = new Map<string, ProjectAllocation>(
    projects.map((project) => [
      project.name,
      new ProjectAllocation(project, projectTeamSize),
    ])
  );
  const unmatched: Applicant[] = [];
  const applicantChosenProject = new Map<number, string>();
  const originalPreferences = new Map<number, string[]>(
    applicants.map((applicant) => [applicant.id, [...applicant.projectChoices]])
  );
  const applicantById = new Map(
    applicants.map((applicant) => [applicant.id, applicant])
  );

  // Cloned, because the queue consumes each applicant's choices with shift().
  const applicantQueue = structuredClone(applicants);

  while (applicantQueue.length !== 0) {
    const applicant = applicantQueue.shift()!;
    const currChoice = applicant.projectChoices.shift();
    if (!currChoice) {
      unmatched.push(applicant);
      continue;
    }

    applicantChosenProject.set(applicant.id, currChoice);

    const currAllocation = allocationResult.get(currChoice)!;
    if (currAllocation.allocated.size() < projectTeamSize) {
      currAllocation.allocated.enqueue(applicant);
      updateCapacity(currAllocation, applicant, 1);
    } else {
      const lowest = currAllocation.allocated.front()!;
      const applicantContribution = contributionOf(currAllocation)(applicant);
      const lowestContribution = contributionOf(currAllocation)(lowest);

      if (applicantContribution > lowestContribution) {
        const loserChosen = applicantChosenProject.get(lowest.id);
        const loserHasOtherChoices = lowest.projectChoices.length > 0;

        if (loserChosen === currChoice || loserHasOtherChoices) {
          currAllocation.allocated.dequeue();
          updateCapacity(currAllocation, lowest, -1);
          currAllocation.allocated.enqueue(applicant);
          updateCapacity(currAllocation, applicant, 1);
          applicantQueue.push(lowest);
        } else {
          applicantQueue.push(applicant);
        }
      } else {
        applicantQueue.push(applicant);
      }
    }
  }

  const redistributionLog: string[] = [];
  const targetSize = redistributeForBalance(
    Array.from(allocationResult.values()),
    applicantChosenProject,
    originalPreferences,
    redistributionLog
  );

  const teams: TeamAllocation[] = Array.from(allocationResult.values()).map(
    (projectAllocation) => ({
      project: projectAllocation.project,
      applicants: projectAllocation.allocated
        .toArray()
        .map((applicant) => applicantById.get(applicant.id)!),
      teamSize: projectAllocation.teamSize,
    })
  );

  const warnings: string[] = [];
  for (const team of teams) {
    for (const applicant of team.applicants) {
      const originalPrefs = originalPreferences.get(applicant.id) || [];
      if (!originalPrefs.includes(team.project.name)) {
        warnings.push(
          `${applicant.name} is in ${team.project.name} but originally chose: ${originalPrefs.join(", ")}`
        );
      }
    }
  }

  return {
    teams,
    // Mapped back to originals so the caller sees intact choices; the queue
    // clones had theirs drained.
    unmatched: unmatched.map((applicant) => applicantById.get(applicant.id)!),
    teamSize: projectTeamSize,
    targetSize,
    redistributionLog,
    warnings,
  };
}

// Local-search phase ported from
// projects-allocation-script/allocation/algorithms/heuristicAscent.ts.

type AnnotatedTeam = TeamAllocation & { utility: number };

type Swap = {
  alloc1: AnnotatedTeam;
  i: number;
  alloc2: AnnotatedTeam;
  j: number;
};

function utilityOf(team: TeamAllocation): number {
  return scoreAllocation(team).objectiveScore;
}

function countAllApplicants(teams: TeamAllocation[]): number {
  let count = 0;
  for (const team of teams) {
    count += team.applicants.length;
  }
  return count;
}

function getMaxIgnores(numProjects: number, numApplicants: number): number {
  if (numProjects === 0 || numApplicants === 0) return 0;
  const maxApplicantsPerProject = Math.ceil(numApplicants / numProjects);
  return (
    maxApplicantsPerProject *
    numProjects *
    (maxApplicantsPerProject * (numProjects - 1))
  );
}

/** @returns the net utility gain, or 0 if the swap was rejected and reverted */
function swapApplicants(swap: Swap): number {
  const { alloc1, i, alloc2, j } = swap;
  const applicant1 = alloc1.applicants[i];
  const applicant2 = alloc2.applicants[j];

  // Hard constraint: each has to have listed the other's project.
  if (
    !applicant1.projectChoices.includes(alloc2.project.name) ||
    !applicant2.projectChoices.includes(alloc1.project.name)
  ) {
    return 0;
  }

  const alloc1OldUtility = alloc1.utility;
  const alloc2OldUtility = alloc2.utility;

  [alloc1.applicants[i], alloc2.applicants[j]] = [
    alloc2.applicants[j],
    alloc1.applicants[i],
  ];

  const alloc1NewUtility = utilityOf(alloc1);
  const alloc2NewUtility = utilityOf(alloc2);
  const netChangeInUtility =
    alloc1NewUtility + alloc2NewUtility - alloc1OldUtility - alloc2OldUtility;

  if (netChangeInUtility > 0) {
    alloc1.utility = alloc1NewUtility;
    alloc2.utility = alloc2NewUtility;
    return netChangeInUtility;
  }

  [alloc1.applicants[i], alloc2.applicants[j]] = [
    alloc2.applicants[j],
    alloc1.applicants[i],
  ];
  return 0;
}

function singleHeuristicAscent(
  startingTeams: TeamAllocation[]
): [AnnotatedTeam[], number] {
  let totalUtility = 0;
  const allocations: AnnotatedTeam[] = startingTeams.map((team) => {
    const utility = utilityOf(team);
    totalUtility += utility;
    return { ...team, utility };
  });

  const swap = { alloc1Index: 0, i: 0, alloc2Index: 1, j: 0 };
  let numIgnoresInRow = 0;
  const maxIgnoresInRow = getMaxIgnores(
    allocations.length,
    countAllApplicants(allocations)
  );
  while (numIgnoresInRow < maxIgnoresInRow) {
    const utilityChange = swapApplicants({
      alloc1: allocations[swap.alloc1Index],
      i: swap.i,
      alloc2: allocations[swap.alloc2Index],
      j: swap.j,
    });

    // Epsilon rather than > 0 because float noise would otherwise reset the
    // counter forever and the loop would never terminate.
    if (utilityChange < 1e-12) {
      numIgnoresInRow++;
    } else {
      numIgnoresInRow = 0;
      totalUtility += utilityChange;
    }

    const alloc1Len = allocations[swap.alloc1Index].applicants.length;
    swap.i = (swap.i + 1) % alloc1Len;
    if (swap.i === 0)
      swap.alloc1Index = (swap.alloc1Index + 1) % allocations.length;
    if (swap.i === 0 && swap.alloc1Index === 0) {
      // The second pointer only advances once the first has swept everyone.
      const alloc2Len = allocations[swap.alloc2Index].applicants.length;
      swap.j = (swap.j + 1) % alloc2Len;
      if (swap.j === 0)
        swap.alloc2Index = (swap.alloc2Index + 1) % allocations.length;
    }
  }

  return [allocations, totalUtility];
}

function heuristicAscent(generator: () => TeamAllocation[]): TeamAllocation[] {
  let highestUtility = 0;
  let bestAllocation: TeamAllocation[] = [];

  for (let i = 0; i < NUM_ASCENTS; i++) {
    const [allocation, utility] = singleHeuristicAscent(generator());
    if (utility > highestUtility) {
      highestUtility = utility;
      bestAllocation = allocation;
    }
  }

  return bestAllocation;
}

/** @see https://stackoverflow.com/a/12646864 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i >= 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Even random split, used only as a quality baseline to compare the run against. */
function randomlyAllocate(
  projects: Project[],
  applicants: Applicant[]
): TeamAllocation[] {
  const numProjects = projects.length;
  const numApplicants = applicants.length;
  const applicantsPerProject = Math.floor(numApplicants / numProjects);
  const leftOverApplicants = numApplicants % numProjects;

  const allocations: TeamAllocation[] = projects.map((project) => ({
    project,
    applicants: [],
    teamSize: applicantsPerProject,
  }));

  const shuffledApplicants = shuffleArray(applicants);
  const shuffledAllocations = shuffleArray(allocations);

  let nextApplicant = 0;
  for (let i = 0; i < numProjects; i++) {
    const numApplicantsToTake =
      i < leftOverApplicants ? applicantsPerProject + 1 : applicantsPerProject;
    shuffledAllocations[i].applicants = shuffledApplicants.slice(
      nextApplicant,
      nextApplicant + numApplicantsToTake
    );
    nextApplicant += numApplicantsToTake;
  }

  return allocations;
}

/**
 * Blocking problems with the uploaded pair of CSVs. The two forms are edited
 * independently each year, so a mismatch between them is expected eventually —
 * and every case here would otherwise crash mid-run or silently lose a team.
 */
export function preflightAllocation(
  pool: Applicant[],
  projects: Project[]
): string[] {
  const problems: string[] = [];

  if (projects.length === 0) problems.push("No projects were loaded.");
  if (pool.length === 0) {
    problems.push(
      "No applicants are left to allocate once designers and flagged applicants are held back."
    );
  }

  const names = new Set<string>();
  const duplicated = new Set<string>();
  for (const project of projects) {
    if (names.has(project.name)) duplicated.add(project.name);
    names.add(project.name);
  }
  for (const name of duplicated) {
    problems.push(
      `Two projects are both named "${name}" — one of them would silently end up with no team.`
    );
  }

  const unknown = new Set<string>();
  for (const applicant of pool) {
    for (const choice of applicant.projectChoices) {
      if (!names.has(choice)) unknown.add(choice);
    }
  }
  const unknownList = [...unknown];
  for (const choice of unknownList.slice(0, 5)) {
    problems.push(
      `Applicants chose "${choice}", but no project has that name.`
    );
  }
  if (unknownList.length > 5) {
    problems.push(
      `…and ${unknownList.length - 5} more project names that appear in applicant choices but not in the projects file. The two exports are probably from different years.`
    );
  }

  return problems;
}

export function runAllocation(
  pool: Applicant[],
  projects: Project[]
): AllocationRun {
  const stable = stableMatching(pool, projects);

  // The ascent indexes with `% team.applicants.length`, so an empty team makes it
  // read applicants[NaN] and throw. The script crashes here; skipping the ascent
  // and returning the matching on its own is the one deliberate behaviour change.
  const ascentSkipped = stable.teams.some(
    (team) => team.applicants.length === 0
  );
  // The generator returns the same array every call and the ascent only
  // shallow-copies, so each run continues the previous one instead of restarting
  // from the seed. That is the script's behaviour — making these independent
  // restarts would change the result.
  const teams = ascentSkipped
    ? stable.teams
    : heuristicAscent(() => stable.teams);

  return {
    teams,
    ascentSkipped,
    unmatched: stable.unmatched,
    teamSize: stable.teamSize,
    targetSize: stable.targetSize,
    totalUtility: calculateTotalUtility(teams),
    baselineUtility: calculateTotalUtility(randomlyAllocate(projects, pool)),
    redistributionLog: stable.redistributionLog,
    warnings: stable.warnings,
  };
}
