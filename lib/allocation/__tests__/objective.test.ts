import { describe, expect, it } from "vitest";

import { calculateUtilityOfAllocation } from "@/lib/allocation/objective";
import type { Allocation } from "@/lib/allocation/models";
import { makeApplicant, makeProject } from "./factories";

describe("calculateUtilityOfAllocation", () => {
  it("scores the reference fixture to its golden value", () => {
    // Weights: A=1, B=0.5, C=1.1, D=1.1, E=0.1.
    // projectPref = 5 (1st) + 2 (4th) + 1 (5th) = 8
    // role: target = 3*4 = 12, deviation = 12, rolePref = 3*5 - 12 = 3
    // exp scores = 0; priority multiplier = 1
    // objective = 1*8 + 0.5*3 = 9.5
    const allocation: Allocation = {
      project: makeProject({ id: 1, name: "A", backendDifficulty: 4, frontendDifficulty: 5, backendWeighting: 4 }),
      applicants: [
        makeApplicant({ id: 0, projectChoices: ["A", "B", "C", "D", "E"] }),
        makeApplicant({ id: 1, projectChoices: ["D", "B", "C", "A", "E"] }),
        makeApplicant({ id: 2, projectChoices: ["F", "B", "C", "D", "A"] }),
      ],
    };

    expect(calculateUtilityOfAllocation(allocation)).toBe(9.5);
  });

  it("awards descending points for choice rank (5 for 1st ... 1 for 5th, 0 unranked)", () => {
    const project = makeProject({ name: "A" });
    const utilFor = (choices: string[]) =>
      calculateUtilityOfAllocation({ project, applicants: [makeApplicant({ projectChoices: choices })] });

    // n=1, weighting 0 -> rolePref = 5 -> base = 0.5*5 = 2.5; projectPref adds A*rank
    expect(utilFor(["A"])).toBe(2.5 + 5);
    expect(utilFor(["X", "A"])).toBe(2.5 + 4);
    expect(utilFor(["X", "Y", "Z", "W", "A"])).toBe(2.5 + 1);
    expect(utilFor(["X", "Y", "Z"])).toBe(2.5 + 0);
  });

  it("gives a requested project the F override (20) regardless of choices", () => {
    const project = makeProject({ name: "A" });
    const withRequest = calculateUtilityOfAllocation({
      project,
      applicants: [makeApplicant({ projectChoices: ["X"], requestedProject: "A" })],
    });
    const withoutRequest = calculateUtilityOfAllocation({
      project,
      applicants: [makeApplicant({ projectChoices: ["X"] })],
    });
    expect(withRequest - withoutRequest).toBe(20);
  });

  it("applies the priority multiplier to experience scores", () => {
    // beExp=5, backendDifficulty=2 -> beExpScore=10; term = (1+E*priority)*C*10
    const applicants = [makeApplicant({ backendExperience: 5, backendPreference: 0 })];
    const base = makeProject({ name: "A", backendDifficulty: 2, priority: 0 });
    const boosted = makeProject({ name: "A", backendDifficulty: 2, priority: 2 });

    const u0 = calculateUtilityOfAllocation({ project: base, applicants });
    const u2 = calculateUtilityOfAllocation({ project: boosted, applicants });

    // difference is (mult2 - mult0) * C * beExpScore = (1.2 - 1.0) * 1.1 * 10 = 2.2
    expect(u2 - u0).toBeCloseTo(2.2, 10);
  });

  it("returns 0 for an empty allocation (no NaN, no throw)", () => {
    expect(calculateUtilityOfAllocation({ project: makeProject({ priority: 0 }), applicants: [] })).toBe(0);
  });
});
