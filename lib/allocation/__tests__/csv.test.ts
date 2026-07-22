import { describe, expect, it } from "vitest";
import Papa from "papaparse";

import {
  applicantsToCsv,
  parseProcessedApplicants,
  parseProjects,
  parseRawApplicants,
} from "@/lib/allocation/csv/parse";
import { makeApplicant } from "./factories";

describe("parseRawApplicants", () => {
  it("maps form columns, experience levels, and drops blank choices", () => {
    const rawRow = {
      Timestamp: "2026/07/01 10:00:00",
      "What is your full name?": "Ada Lovelace",
      "Email address?": "ada@test.com",
      "What is your GitHub username?": "ada",
      "Role preference": "Any",
      "Previous technical experience": "React, Node",
      "What kind of work do you have a higher preference towards learning/doing within projects?": "4",
      "How would you rate your experience level in the following areas? [Front-end dev]":
        "High experience (intern/work project)",
      "How would you rate your experience level in the following areas? [Back-end dev]": "No experience",
      "Your first choice:": "Alpha",
      "Your second choice:": "Bravo",
      "Your third choice:": "",
      "Your fourth choice:": "",
      "Your fifth choice:": "",
      "EXEC RATING (0 to 5)": "2",
      "CREATIVITY HIRE (manual Design/Design-dev allocation)": "creative maybe",
      "REQUESTED PROJECT (please copy and paste the project name EXACTLY)": "Alpha",
    };
    const [a] = parseRawApplicants(Papa.unparse([rawRow]));

    expect(a.id).toBe(0);
    expect(a.name).toBe("Ada Lovelace");
    expect(a.email).toBe("ada@test.com");
    expect(a.github).toBe("ada");
    expect(a.skills).toEqual(["React", "Node"]);
    expect(a.backendPreference).toBe(4);
    expect(a.frontendExperience).toBe(4);
    expect(a.backendExperience).toBe(1);
    expect(a.projectChoices).toEqual(["Alpha", "Bravo"]);
    expect(a.rizzLevel).toBe(2);
    expect(a.creativityHire).toBe("creative maybe");
    expect(a.requestedProject).toBe("Alpha");
  });

  it("returns an empty array for an empty CSV", () => {
    expect(parseRawApplicants("")).toEqual([]);
  });
});

describe("parseProjects", () => {
  it("maps project columns by name", () => {
    const row = {
      "What is the name of your project?": "Alpha",
      "How difficult do you expect your backend development to be?": "3",
      "How difficult do you expect your frontend development to be?": "4",
      "What's the backend-frontend weighting of your project?": "5",
      "What's your preference for beginners vs experienced members?": "1",
    };
    const [p] = parseProjects(Papa.unparse([row]));
    expect(p.id).toBe(0);
    expect(p.name).toBe("Alpha");
    // numeric fields are kept as raw strings; arithmetic coerces them downstream.
    expect(Number(p.backendWeighting)).toBe(5);
  });
});

describe("parseProcessedApplicants", () => {
  it("round-trips project names containing commas through applicantsToCsv", () => {
    const applicants = [
      makeApplicant({
        id: 7,
        name: "Grace",
        backendPreference: 3,
        skills: ["React, Redux", "Node"],
        projectChoices: ["AI, ML Tool", "Web/API: v2", "Charlie"],
      }),
    ];
    const [back] = parseProcessedApplicants(applicantsToCsv(applicants));

    expect(back.id).toBe(7);
    expect(back.name).toBe("Grace");
    expect(back.backendPreference).toBe(3);
    expect(back.skills).toEqual(["React, Redux", "Node"]);
    expect(back.projectChoices).toEqual(["AI, ML Tool", "Web/API: v2", "Charlie"]);
  });

  it("falls back to comma-splitting for hand-authored lists (backward compat)", () => {
    const csv = Papa.unparse([{ id: "1", projectChoices: "Alpha,Bravo", skills: "x,y" }]);
    const [back] = parseProcessedApplicants(csv);
    expect(back.projectChoices).toEqual(["Alpha", "Bravo"]);
    expect(back.skills).toEqual(["x", "y"]);
  });

  it("does not throw on missing columns (yields NaN / empty)", () => {
    const csv = Papa.unparse([{ id: "5" }]);
    const [back] = parseProcessedApplicants(csv);
    expect(back.id).toBe(5);
    expect(Number.isNaN(back.backendPreference)).toBe(true);
    expect(back.projectChoices).toEqual([]);
  });
});
