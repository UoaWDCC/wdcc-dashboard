import type { Applicant, Project } from "@/lib/allocation/models";

/** Builds an Applicant with sensible zero-ish defaults; override any field. */
export function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    timestamp: new Date("2026-01-01T00:00:00.000Z"),
    id: 0,
    name: "",
    email: "",
    github: "",
    major: "",
    rolePreference: "",
    skills: [],
    backendPreference: 0,
    frontendExperience: 0,
    backendExperience: 0,
    designExperience: 0,
    testingExperience: 0,
    projectChoices: [],
    passionBlurb: "",
    portfolioLink: "",
    additionalInfo: "",
    execComments: "",
    creativityHire: "",
    rizzLevel: 0,
    requestedProject: "",
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 0,
    name: "A",
    backendDifficulty: 0,
    frontendDifficulty: 0,
    backendWeighting: 0,
    priority: 0,
    ...overrides,
  };
}
