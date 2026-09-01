import Papa from "papaparse";

import { APPLICANT_HEADERS, PROJECT_HEADERS } from "./csv-mappings";
import { mapExperience } from "./experience";
import type { Applicant, Project } from "./types";

export type ParseResult<T> = {
  rows: T[];
  skipped: number;
  warnings: number;
};

function parseCsv(content: string) {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return { rows: result.data, warnings: result.errors.length };
}

// A form gets re-edited every recruitment cycle, so check every column up front
// rather than let a renamed question silently blank out that field for everyone.
function assertHeaders(
  row: Record<string, string> | undefined,
  headers: Record<string, string>,
  formName: string
) {
  if (!row) {
    throw new Error(
      `This doesn't look like the ${formName} export — the file has no rows.`
    );
  }
  const missing = Object.values(headers).filter((header) => !(header in row));
  if (missing.length > 0) {
    throw new Error(
      `This doesn't look like the ${formName} export — missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`
    );
  }
}

// Google Forms timestamps export as NZ-locale "DD/MM/YYYY HH:mm:ss", which
// Date's own parser misreads as MM/DD.
const TIMESTAMP_PATTERN =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;

function parseTimestamp(value: string | undefined): Date | null {
  const match = TIMESTAMP_PATTERN.exec(value ?? "");
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function splitSkills(value: string | undefined): string[] {
  return (
    value
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []
  );
}

// Applicants may skip the backend/frontend preference slider; blank reads as "no preference".
const NEUTRAL_PREFERENCE = 3;

export function parseApplicantsCsv(content: string): ParseResult<Applicant> {
  const { rows: csvRows, warnings } = parseCsv(content);
  assertHeaders(csvRows[0], APPLICANT_HEADERS, "applicant application form");

  let skipped = 0;
  const rows: Applicant[] = [];
  csvRows.forEach((row, index) => {
    const name = row[APPLICANT_HEADERS.name]?.trim();
    const email = row[APPLICANT_HEADERS.email]?.trim();
    if (!name || !email) {
      skipped++;
      return;
    }
    rows.push({
      id: index,
      timestamp: parseTimestamp(row[APPLICANT_HEADERS.timestamp]),
      isMember: row[APPLICANT_HEADERS.isMember]?.trim().toLowerCase() === "yes",
      name,
      email,
      major: row[APPLICANT_HEADERS.major] ?? "",
      rolePreference: row[APPLICANT_HEADERS.rolePreference] ?? "",
      github: row[APPLICANT_HEADERS.github] ?? "",
      skills: splitSkills(row[APPLICANT_HEADERS.skills]),
      backendPreference: parseInteger(
        row[APPLICANT_HEADERS.backendPreference],
        NEUTRAL_PREFERENCE
      ),
      portfolioLink: row[APPLICANT_HEADERS.portfolioLink] ?? "",
      frontendTools: row[APPLICANT_HEADERS.frontendTools] ?? "",
      designStyle: row[APPLICANT_HEADERS.designStyle] ?? "",
      figmaExperience: row[APPLICANT_HEADERS.figmaExperience] ?? "",
      frontendExperience: mapExperience(
        row[APPLICANT_HEADERS.frontendExperience]
      ),
      backendExperience: mapExperience(
        row[APPLICANT_HEADERS.backendExperience]
      ),
      designExperience: mapExperience(row[APPLICANT_HEADERS.designExperience]),
      testingExperience: mapExperience(
        row[APPLICANT_HEADERS.testingExperience]
      ),
      projectChoices: [
        row[APPLICANT_HEADERS.choice1],
        row[APPLICANT_HEADERS.choice2],
        row[APPLICANT_HEADERS.choice3],
        row[APPLICANT_HEADERS.choice4],
        row[APPLICANT_HEADERS.choice5],
      ].filter((choice): choice is string => Boolean(choice)),
      passionBlurb: row[APPLICANT_HEADERS.passionBlurb] ?? "",
      cvLink: row[APPLICANT_HEADERS.cvLink] ?? "",
      jobInterest: row[APPLICANT_HEADERS.jobInterest] ?? "",
      additionalInfo: row[APPLICANT_HEADERS.additionalInfo] ?? "",
      execNotes: row[APPLICANT_HEADERS.execNotes] ?? "",
    });
  });

  return { rows, skipped, warnings };
}

export function parseProjectsCsv(content: string): ParseResult<Project> {
  const { rows: csvRows, warnings } = parseCsv(content);
  assertHeaders(csvRows[0], PROJECT_HEADERS, "project preferences form");

  let skipped = 0;
  const rows: Project[] = [];
  csvRows.forEach((row, index) => {
    const name = row[PROJECT_HEADERS.name]?.trim();
    if (!name) {
      skipped++;
      return;
    }
    rows.push({
      id: index,
      timestamp: parseTimestamp(row[PROJECT_HEADERS.timestamp]),
      name,
      backendWeighting: parseInteger(
        row[PROJECT_HEADERS.backendWeighting],
        NEUTRAL_PREFERENCE
      ),
      priority: parseInteger(row[PROJECT_HEADERS.priority], NEUTRAL_PREFERENCE),
      frontendDifficulty: parseInteger(
        row[PROJECT_HEADERS.frontendDifficulty],
        NEUTRAL_PREFERENCE
      ),
      backendDifficulty: parseInteger(
        row[PROJECT_HEADERS.backendDifficulty],
        NEUTRAL_PREFERENCE
      ),
      designersNeeded: row[PROJECT_HEADERS.designersNeeded] ?? "",
      notes: row[PROJECT_HEADERS.notes] ?? "",
    });
  });

  return { rows, skipped, warnings };
}
