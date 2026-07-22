import { describe, expect, it } from "vitest";

import { mapExperience } from "@/lib/allocation/csv/mapExperience";

describe("mapExperience", () => {
  it("maps each known experience level to its rank", () => {
    expect(mapExperience("No experience")).toBe(1);
    expect(mapExperience("Low experience (some tutorial videos / playing around)")).toBe(2);
    expect(mapExperience("Moderate experience (course/personal project)")).toBe(3);
    expect(mapExperience("High experience (intern/work project)")).toBe(4);
    expect(mapExperience("Pro (many internships and professional work)")).toBe(5);
  });

  it("defaults unknown or empty values to 1", () => {
    expect(mapExperience("")).toBe(1);
    expect(mapExperience("something else")).toBe(1);
    expect(mapExperience(undefined as unknown as string)).toBe(1);
  });
});
