import { describe, expect, it } from "vitest";

import { computeAllocationMetrics, summarizeProject } from "@/lib/allocation/metrics";
import type { Allocation } from "@/lib/allocation/models";
import { makeApplicant, makeProject } from "./factories";

describe("summarizeProject", () => {
  it("buckets applicants by choice rank (1st..5th)", () => {
    const project = makeProject({ name: "P" });
    const allocation: Allocation = {
      project,
      applicants: [
        makeApplicant({ id: 0, projectChoices: ["P", "a"] }), // 1st
        makeApplicant({ id: 1, projectChoices: ["a", "b", "P"] }), // 3rd
        makeApplicant({ id: 2, projectChoices: ["a", "b"] }), // unranked
      ],
    };
    const s = summarizeProject(allocation);
    expect(s.buckets.find((b) => b.rank === 1)!.applicants.map((a) => a.id)).toEqual([0]);
    expect(s.buckets.find((b) => b.rank === 3)!.applicants.map((a) => a.id)).toEqual([1]);
    expect(s.buckets.find((b) => b.rank === 0)!.applicants.map((a) => a.id)).toEqual([2]);
  });

  it("clamps a 6th-or-later choice into the rank-0 bucket without overflowing", () => {
    const project = makeProject({ name: "P" });
    // "P" is the applicant's 6th choice (index 5); buckets only cover ranks 0..5.
    const allocation: Allocation = {
      project,
      applicants: [makeApplicant({ id: 0, projectChoices: ["a", "b", "c", "d", "e", "P"] })],
    };
    const s = summarizeProject(allocation);
    expect(s.buckets.every((b) => b.rank <= 5)).toBe(true);
    expect(s.buckets.find((b) => b.rank === 0)!.applicants.map((a) => a.id)).toEqual([0]);
  });
});

describe("computeAllocationMetrics", () => {
  const project = makeProject({ name: "P", backendWeighting: 3, priority: 3 });

  function allocationOf(applicants: Allocation["applicants"]): Allocation[] {
    return [{ project, applicants }];
  }

  it("counts choice ranks and the top-3 rate across every team", () => {
    const applicants = [
      makeApplicant({ id: 0, projectChoices: ["P"] }), // 1st
      makeApplicant({ id: 1, projectChoices: ["a", "P"] }), // 2nd
      makeApplicant({ id: 2, projectChoices: ["a", "b", "c", "P"] }), // 4th
      makeApplicant({ id: 3, projectChoices: ["a"] }), // unranked
    ];
    const metrics = computeAllocationMetrics(allocationOf(applicants), applicants);

    expect(metrics.choiceCounts).toEqual({ 0: 1, 1: 1, 2: 1, 3: 0, 4: 1, 5: 0 });
    expect(metrics.topThreeRate).toBe(0.5);
    expect(metrics.numApplicants).toBe(4);
    expect(metrics.numTeams).toBe(1);
  });

  it("averages experience across everyone placed", () => {
    const applicants = [
      makeApplicant({ id: 0, projectChoices: ["P"], frontendExperience: 2, backendExperience: 4 }),
      makeApplicant({ id: 1, projectChoices: ["P"], frontendExperience: 4, backendExperience: 2 }),
    ];
    const metrics = computeAllocationMetrics(allocationOf(applicants), applicants);

    expect(metrics.meanFrontendExperience).toBe(3);
    expect(metrics.meanBackendExperience).toBe(3);
  });

  it("reports backend balance against what the lead asked for", () => {
    const applicants = [
      makeApplicant({ id: 0, projectChoices: ["P"], backendPreference: 5 }),
      makeApplicant({ id: 1, projectChoices: ["P"], backendPreference: 5 }),
    ];
    const metrics = computeAllocationMetrics(allocationOf(applicants), applicants);

    expect(metrics.teams[0].meanBackendPreference).toBe(5);
    expect(metrics.teams[0].backendWeighting).toBe(3);
    expect(metrics.teams[0].backendDeviation).toBe(2);
    expect(metrics.warnings).toContainEqual(expect.stringContaining("wanted 3, got 5.0"));
  });

  it("counts who could actually cover each role", () => {
    const applicants = [
      // backendExperience * backendPreference = 15 >= 10, frontend 1 * 1 = 1 -> backend only
      makeApplicant({ id: 0, projectChoices: ["P"], backendExperience: 3, backendPreference: 5, frontendExperience: 1 }),
      // frontendExperience * (6 - backendPreference) = 5 * 5 = 25 -> frontend only
      makeApplicant({ id: 1, projectChoices: ["P"], backendExperience: 1, backendPreference: 1, frontendExperience: 5 }),
      makeApplicant({ id: 2, projectChoices: ["P"], designExperience: 4 }),
    ];
    const metrics = computeAllocationMetrics(allocationOf(applicants), applicants);

    expect(metrics.teams[0].capableBackend).toBe(1);
    expect(metrics.teams[0].capableFrontend).toBe(1);
    expect(metrics.teams[0].capableDesign).toBe(1);
  });

  it("warns when a team has nobody able to cover a role", () => {
    const applicants = [makeApplicant({ id: 0, projectChoices: ["P"], backendPreference: 3 })];
    const metrics = computeAllocationMetrics(allocationOf(applicants), applicants);

    expect(metrics.warnings).toContainEqual(expect.stringContaining("nobody suited to backend"));
    expect(metrics.warnings).toContainEqual(expect.stringContaining("nobody suited to frontend"));
  });

  it("flags applicants that went missing or got placed twice", () => {
    const placed = makeApplicant({ id: 0, projectChoices: ["P"] });
    const dropped = makeApplicant({ id: 1, projectChoices: ["P"] });
    const metrics = computeAllocationMetrics(allocationOf([placed, placed]), [placed, dropped]);

    expect(metrics.numMissing).toBe(1);
    expect(metrics.numDuplicated).toBe(1);
    expect(metrics.warnings).toContainEqual(expect.stringContaining("not placed on any team"));
    expect(metrics.warnings).toContainEqual(expect.stringContaining("more than one team"));
  });

  it("groups a repeated problem into one warning naming the teams", () => {
    const bare = (id: number) => makeApplicant({ id, projectChoices: ["P"], backendPreference: 3 });
    const allocations: Allocation[] = [0, 1, 2].map((id) => ({
      project: makeProject({ id, name: `P${id}`, backendWeighting: 3, priority: 3 }),
      applicants: [bare(id)],
    }));
    const metrics = computeAllocationMetrics(allocations, [bare(0), bare(1), bare(2)]);

    const backendWarnings = metrics.warnings.filter((w) => w.includes("nobody suited to backend"));
    expect(backendWarnings).toHaveLength(1);
    expect(backendWarnings[0]).toContain("3 teams");
  });

  it("returns zeroed metrics rather than NaN for an empty allocation", () => {
    const metrics = computeAllocationMetrics([], []);

    expect(metrics.numApplicants).toBe(0);
    expect(metrics.topThreeRate).toBe(0);
    expect(metrics.meanFrontendExperience).toBe(0);
    expect(metrics.meanBackendDeviation).toBe(0);
    expect(metrics.smallestTeam).toBe(0);
    expect(metrics.largestTeam).toBe(0);
  });

  it("does not divide by zero on a team with no members", () => {
    const metrics = computeAllocationMetrics(allocationOf([]), []);

    expect(metrics.teams[0].topThreeRate).toBe(0);
    expect(metrics.teams[0].backendDeviation).toBe(0);
    expect(metrics.teams[0].meanFrontendExperience).toBe(0);
    expect(metrics.warnings).toContainEqual("1 team has no members: P.");
  });
});
