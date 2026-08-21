import { describe, expect, it } from "vitest";

import { preprocessApplicants } from "@/lib/allocation/preprocess";
import type { Applicant } from "@/lib/allocation/models";
import { makeApplicant } from "./factories";

const LONG_BLURB = "x".repeat(120);

/** An applicant who clears every review rule, so each test only varies the field it exercises. */
function placeable(overrides: Partial<Applicant> = {}): Applicant {
  return makeApplicant({ passionBlurb: LONG_BLURB, projectChoices: ["Alpha"], rizzLevel: 3, ...overrides });
}

describe("preprocessApplicants", () => {
  it("splits designers by creativityHire (case-insensitive)", () => {
    const applicants = [
      placeable({ id: 0, creativityHire: "Creative Guarantee" }),
      placeable({ id: 1, creativityHire: "creative maybe" }),
      placeable({ id: 2, creativityHire: "" }),
    ];
    const { designers, processed } = preprocessApplicants(applicants);
    expect(designers.map((a) => a.id)).toEqual([0, 1]);
    expect(processed.map((a) => a.id)).toEqual([2]);
  });

  it("flags applicants with a short or empty passion blurb, or rizzLevel 1", () => {
    const applicants = [
      placeable({ id: 0, passionBlurb: "too short" }),
      placeable({ id: 1, rizzLevel: 1 }),
      placeable({ id: 2 }),
      placeable({ id: 3, passionBlurb: "" }),
    ];
    const { flagged, processed } = preprocessApplicants(applicants);
    expect(flagged.map((a) => a.id)).toEqual([0, 1, 3]);
    expect(processed.map((a) => a.id)).toEqual([2]);
  });

  it("flags applicants who picked no projects", () => {
    const applicants = [placeable({ id: 0, projectChoices: [] }), placeable({ id: 1 })];
    const { flagged, processed } = preprocessApplicants(applicants);
    expect(flagged.map((a) => a.id)).toEqual([0]);
    expect(processed.map((a) => a.id)).toEqual([1]);
  });

  it("keeps blurbs at the 50-character threshold", () => {
    const applicants = [
      placeable({ id: 0, passionBlurb: "x".repeat(49) }),
      placeable({ id: 1, passionBlurb: "x".repeat(50) }),
    ];
    const { flagged, processed } = preprocessApplicants(applicants);
    expect(flagged.map((a) => a.id)).toEqual([0]);
    expect(processed.map((a) => a.id)).toEqual([1]);
  });

  it("excludes designers and flagged from the processed list (no leaks)", () => {
    const applicants = [
      placeable({ id: 0, creativityHire: "creative maybe" }),
      placeable({ id: 1, passionBlurb: "short" }),
      placeable({ id: 2 }),
    ];
    const { processed, designers, flagged } = preprocessApplicants(applicants);

    expect(processed.map((a) => a.id)).toEqual([2]);
    const designerIds = new Set(designers.map((a) => a.id));
    const flaggedIds = new Set(flagged.map((a) => a.id));
    for (const a of processed) {
      expect(designerIds.has(a.id)).toBe(false);
      expect(flaggedIds.has(a.id)).toBe(false);
    }
  });

  it("returns empty lists for empty input", () => {
    const { processed, designers, flagged } = preprocessApplicants([]);
    expect(processed).toEqual([]);
    expect(designers).toEqual([]);
    expect(flagged).toEqual([]);
  });
});
