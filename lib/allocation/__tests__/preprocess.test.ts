import { describe, expect, it } from "vitest";

import { preprocessApplicants } from "@/lib/allocation/preprocess";
import { makeApplicant } from "./factories";

const LONG_BLURB = "x".repeat(120);

describe("preprocessApplicants", () => {
  it("splits designers by creativityHire (case-insensitive)", () => {
    const applicants = [
      makeApplicant({ id: 0, creativityHire: "Creative Guarantee", passionBlurb: LONG_BLURB }),
      makeApplicant({ id: 1, creativityHire: "creative maybe", passionBlurb: LONG_BLURB }),
      makeApplicant({ id: 2, creativityHire: "", passionBlurb: LONG_BLURB }),
    ];
    const { designers, processed } = preprocessApplicants(applicants);
    expect(designers.map((a) => a.id)).toEqual([0, 1]);
    expect(processed.map((a) => a.id)).toEqual([2]);
  });

  it("flags applicants with a short passion blurb or rizzLevel 1", () => {
    const applicants = [
      makeApplicant({ id: 0, passionBlurb: "too short", rizzLevel: 3 }),
      makeApplicant({ id: 1, passionBlurb: LONG_BLURB, rizzLevel: 1 }),
      makeApplicant({ id: 2, passionBlurb: LONG_BLURB, rizzLevel: 3 }),
    ];
    const { flagged, processed } = preprocessApplicants(applicants);
    expect(flagged.map((a) => a.id)).toEqual([0, 1]);
    expect(processed.map((a) => a.id)).toEqual([2]);
  });

  it("excludes designers and flagged from the processed list (no leaks)", () => {
    const applicants = [
      makeApplicant({ id: 0, creativityHire: "creative maybe", passionBlurb: LONG_BLURB }),
      makeApplicant({ id: 1, passionBlurb: "short", rizzLevel: 3 }),
      makeApplicant({ id: 2, passionBlurb: LONG_BLURB, rizzLevel: 3 }),
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
