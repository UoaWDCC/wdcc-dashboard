import {
  MinPriorityQueue,
  type IGetCompareValue,
} from "@datastructures-js/priority-queue";

import type { Applicant, Project, TeamAllocation } from "./types";

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

  // Identical for every member of a queue, so it cancels out of every
  // comparison. Kept because dropping it would be an unverified claim.
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

export type StableMatchingResult = {
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
