import Papa from "papaparse";

import { Applicant, Project } from "../models";
import { mapExperience } from "./mapExperience";

// Applicant list fields are joined with this delimiter on export so that values
// containing commas (e.g. a project name) survive a download/re-upload round trip.
const LIST_DELIM = "|";

function parseCsv(content: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

function splitList(value: string | undefined): string[] {
  if (!value) return [];
  const delim = value.includes(LIST_DELIM) ? LIST_DELIM : ",";
  return value
    .split(delim)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parses the raw Google Form applicant CSV export. */
export function parseRawApplicants(content: string): Applicant[] {
  return parseCsv(content).map((row, index) => ({
    timestamp: new Date(row["Timestamp"]),
    id: index,
    name: row["What is your full name?"],
    email: row["Email address?"],
    github: row["What is your GitHub username?"],
    major: row["What do you study? (Degree: major)"],
    rolePreference: row["Role preference"],
    skills: row["Previous technical experience"]?.split(",").map((s: string) => s.trim()) || [],
    backendPreference: parseInt(
      row["What kind of work do you have a higher preference towards learning/doing within projects?"]
    ),
    frontendExperience: mapExperience(
      row["How would you rate your experience level in the following areas? [Front-end dev]"]
    ),
    backendExperience: mapExperience(
      row["How would you rate your experience level in the following areas? [Back-end dev]"]
    ),
    designExperience: mapExperience(
      row["How would you rate your experience level in the following areas? [Design]"]
    ),
    testingExperience: mapExperience(
      row["How would you rate your experience level in the following areas? [Testing]"]
    ),
    projectChoices: [
      row["Your first choice:"],
      row["Your second choice:"],
      row["Your third choice:"],
      row["Your fourth choice:"],
      row["Your fifth choice:"],
    ].filter(Boolean),
    passionBlurb: row["What do you wish to gain from being on a project? (aim for ~100 words)"] || "",
    portfolioLink: row["Do you have a Portfolio and/or CV? (insert a link here if so)"] || "",
    additionalInfo: row["Anything else you would like us to know?"] || "",
    execComments: row["EXEC INITIAL COMMENTS"] || "",
    rizzLevel: parseInt(row["EXEC RATING (0 to 5)"], 10) || 0,
    creativityHire: row["CREATIVITY HIRE (manual Design/Design-dev allocation)"],
    requestedProject: row["REQUESTED PROJECT (please copy and paste the project name EXACTLY)"],
  }));
}

/** Parses a preprocessed applicant CSV (column headers = Applicant field names). */
export function parseProcessedApplicants(content: string): Applicant[] {
  return parseCsv(content).map((row) => ({
    timestamp: new Date(row["timestamp"]),
    id: parseInt(row["id"]),
    name: row["name"],
    email: row["email"],
    github: row["github"],
    major: row["major"],
    rolePreference: row["rolePreference"],
    skills: splitList(row["skills"]),
    backendPreference: parseInt(row["backendPreference"], 10),
    frontendExperience: parseInt(row["frontendExperience"], 10),
    backendExperience: parseInt(row["backendExperience"], 10),
    designExperience: parseInt(row["designExperience"], 10),
    testingExperience: parseInt(row["testingExperience"], 10),
    projectChoices: splitList(row["projectChoices"]),
    passionBlurb: row["passionBlurb"] || "",
    portfolioLink: row["portfolioLink"] || "",
    additionalInfo: row["additionalInfo"] || "",
    execComments: row["execComments"] || "",
    rizzLevel: parseInt(row["rizzLevel"], 10) || 0,
    creativityHire: row["creativityHire"],
    requestedProject: row["requestedProject"],
  }));
}

/** Parses the projects CSV export. */
export function parseProjects(content: string): Project[] {
  // Numeric fields are left as their raw CSV strings; the objective-function arithmetic
  // coerces them to numbers. Kept as-is to preserve identical scoring behaviour.
  const num = (v: string) => v as unknown as number;
  return parseCsv(content).map((row, index) => ({
    id: index,
    name: row["What is the name of your project?"],
    backendDifficulty: num(row["How difficult do you expect your backend development to be?"]),
    frontendDifficulty: num(row["How difficult do you expect your frontend development to be?"]),
    backendWeighting: num(row["What's the backend-frontend weighting of your project?"]),
    priority: num(row["What's your preference for beginners vs experienced members?"]),
  }));
}

/** Serializes applicants to a CSV string, joining list fields with a round-trip-safe delimiter. */
export function applicantsToCsv(applicants: Applicant[]): string {
  return Papa.unparse(
    applicants.map((a) => ({
      ...a,
      skills: a.skills.join(LIST_DELIM),
      projectChoices: a.projectChoices.join(LIST_DELIM),
    }))
  );
}
