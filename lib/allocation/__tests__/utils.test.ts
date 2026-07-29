import { describe, expect, it } from "vitest";

import { applicantBackendFraction, backendFraction, centeredPriority } from "@/lib/allocation/utils";
import { makeApplicant, makeProject } from "./factories";

describe("backendFraction", () => {
  it("maps the 1-5 weighting onto a 0-1 backend share", () => {
    const fractionFor = (backendWeighting: number) => backendFraction(makeProject({ backendWeighting }));
    expect(fractionFor(1)).toBe(0);
    expect(fractionFor(3)).toBe(0.5);
    expect(fractionFor(5)).toBe(1);
  });
});

describe("applicantBackendFraction", () => {
  it("puts backendPreference on the same 0-1 footing as the project weighting", () => {
    const fractionFor = (backendPreference: number) => applicantBackendFraction(makeApplicant({ backendPreference }));
    expect(fractionFor(1)).toBe(0);
    expect(fractionFor(3)).toBe(0.5);
    expect(fractionFor(5)).toBe(1);
  });
});

describe("centeredPriority", () => {
  it("centres the 1-5 scale on 3 so neutral is 0", () => {
    const centred = (priority: number) => centeredPriority(makeProject({ priority }));
    expect(centred(3)).toBe(0);
    expect(centred(1)).toBe(-2);
    expect(centred(5)).toBe(2);
  });
});
