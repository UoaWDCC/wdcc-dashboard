import Papa from "papaparse";

import { choiceRank } from "./objective";
import type { Applicant, TeamAllocation } from "./types";

// Same sanitiser the allocation script uses, so a team file lands on the same
// name here as it does there.
const safeName = (name: string) => name.replace(/[\\/:.]/g, "_");

export function teamFileName(projectName: string): string {
  return `applicants-${safeName(projectName)}.csv`;
}

export function toCsvRow(applicant: Applicant) {
  return {
    ...applicant,
    timestamp: applicant.timestamp?.toISOString() ?? "",
    skills: applicant.skills.join(", "),
    projectChoices: applicant.projectChoices.join(", "),
  };
}

/** Team rows with the project and the member's choice rank prepended. */
export function teamRows(team: TeamAllocation) {
  return team.applicants.map((applicant) => ({
    project: team.project.name,
    choice: choiceRank(applicant, team.project.name) || "",
    ...toCsvRow(applicant),
  }));
}

export function buildCsv(rows: object[]): string {
  return Papa.unparse(rows);
}
