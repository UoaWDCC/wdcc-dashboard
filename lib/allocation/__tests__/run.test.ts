import { describe, expect, it } from "vitest";

import { runAllocation, safeProjectName, summarizeProject } from "@/lib/allocation/run";
import type { Allocation } from "@/lib/allocation/models";
import { makeApplicant, makeProject } from "./factories";

const PROJECT_NAMES = ["P0", "P1", "P2", "P3", "P4", "P5"];

function rotate<T>(arr: T[], by: number): T[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i + by) % n]);
}

function buildInput(numApplicants: number) {
  const projects = PROJECT_NAMES.map((name, id) =>
    makeProject({ id, name, backendDifficulty: 3, frontendDifficulty: 3, backendWeighting: 3, priority: 1 })
  );
  const applicants = Array.from({ length: numApplicants }, (_, i) =>
    makeApplicant({
      id: i,
      // every choice is a valid project name (6 choices), rotated per applicant
      projectChoices: rotate(PROJECT_NAMES, i % PROJECT_NAMES.length),
      backendPreference: (i % 5) + 1,
      frontendExperience: (i % 5) + 1,
      backendExperience: ((i + 2) % 5) + 1,
    })
  );
  return { projects, applicants };
}

function teamSignature(allocations: Allocation[]): string {
  return allocations
    .map((a) => `${a.project.name}:[${a.applicants.map((x) => x.id).sort((p, q) => p - q).join(",")}]`)
    .join(" | ");
}

describe("runAllocation", () => {
  it("places every applicant exactly once (no loss, no duplicates)", () => {
    const { projects, applicants } = buildInput(30);
    const result = runAllocation(applicants, projects);

    expect(result.numApplicants).toBe(30);
    const placedIds = result.allocations.flatMap((a) => a.applicants.map((x) => x.id)).sort((p, q) => p - q);
    expect(placedIds).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect(new Set(placedIds).size).toBe(30); // no duplicates
  });

  it("is deterministic for identical input", () => {
    const { projects, applicants } = buildInput(24);
    const a = runAllocation(applicants, projects);
    const b = runAllocation(applicants, projects);
    expect(teamSignature(a.allocations)).toBe(teamSignature(b.allocations));
  });

  it("does not crash when a project ends up with zero applicants", () => {
    // Funnel: everyone ranks the same 6 valid projects in the same order, which leaves
    // at least one project with no members and exercises the empty-team path.
    const projects = PROJECT_NAMES.map((name, id) =>
      makeProject({ id, name, backendDifficulty: 3, frontendDifficulty: 3, backendWeighting: 3, priority: 1 })
    );
    const applicants = Array.from({ length: 30 }, (_, i) =>
      makeApplicant({
        id: i,
        projectChoices: [...PROJECT_NAMES],
        backendPreference: (i % 5) + 1,
        backendExperience: (i % 5) + 1,
        frontendExperience: ((i + 2) % 5) + 1,
      })
    );

    const result = runAllocation(applicants, projects);
    expect(result.numApplicants).toBe(30);
    expect(result.projectSummaries.some((s) => s.count === 0)).toBe(true); // an empty team occurred
  });

  it("bucket counts sum to team size", () => {
    const { projects, applicants } = buildInput(30);
    const result = runAllocation(applicants, projects);
    for (const summary of result.projectSummaries) {
      const total = summary.buckets.reduce((sum, b) => sum + b.applicants.length, 0);
      expect(total).toBe(summary.count);
    }
  });
});

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

describe("safeProjectName", () => {
  it("replaces every backslash, slash, colon and dot (global)", () => {
    expect(safeProjectName("a/b:c.d")).toBe("a_b_c_d");
    expect(safeProjectName("x/y/z")).toBe("x_y_z");
    expect(safeProjectName("Clean Name")).toBe("Clean Name");
  });
});
