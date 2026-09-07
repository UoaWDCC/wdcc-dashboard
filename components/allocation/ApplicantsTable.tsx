"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import type { Applicant } from "@/lib/allocation/types";

import { textPopup, useExpandableCell } from "@/hooks/use-expandable-cell";
import { useSortableRows } from "@/hooks/use-sortable-rows";

function skillsList(skills: string[]) {
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((skill, index) => (
        <Badge key={index} variant="secondary">
          {skill}
        </Badge>
      ))}
    </div>
  );
}

function choicesList(choices: string[]) {
  return (
    <ol className="list-inside list-decimal space-y-1">
      {choices.map((choice, index) => (
        <li key={index}>{choice}</li>
      ))}
    </ol>
  );
}

// Sorts best-choice first, with "not chosen" last.
const choiceOrder = (rank: number) => (rank === 0 ? 6 : 6 - rank);

export function ApplicantsTable({
  applicants,
  choiceRankFor,
}: {
  applicants: Applicant[];
  choiceRankFor?: (applicant: Applicant) => number;
}) {
  const { cell, dialog } = useExpandableCell();
  const { head, sortedRows } = useSortableRows(applicants);

  if (applicants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No applicants in this group.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {head("Name", "name", (a) => a.name)}
            {head("Email", "email", (a) => a.email)}
            {head("Major", "major", (a) => a.major)}
            {head("Skills", "skills", (a) => a.skills.join(", "))}
            {head(
              "BE pref",
              "backendPreference",
              (a) => a.backendPreference,
              "text-center"
            )}
            {head(
              "FE",
              "frontendExperience",
              (a) => a.frontendExperience,
              "text-center"
            )}
            {head(
              "BE",
              "backendExperience",
              (a) => a.backendExperience,
              "text-center"
            )}
            {head(
              "Design",
              "designExperience",
              (a) => a.designExperience,
              "text-center"
            )}
            {head(
              "Testing",
              "testingExperience",
              (a) => a.testingExperience,
              "text-center"
            )}
            {head("Project choices", "projectChoices", (a) =>
              a.projectChoices.join(", ")
            )}
            {head("Member", "isMember", (a) => (a.isMember ? 1 : 0))}
            {choiceRankFor &&
              head(
                "Choice",
                "choice",
                (a) => choiceOrder(choiceRankFor(a)),
                "text-center"
              )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((applicant) => (
            <TableRow key={applicant.id}>
              {cell(applicant.name, { className: "max-w-32 font-medium" })}
              {cell(applicant.email, {
                className: "max-w-48 text-muted-foreground",
              })}
              {cell(applicant.major, {
                title: "Major",
                content: textPopup(applicant.major),
              })}
              {cell(applicant.skills.join(", "), {
                title: "Skills",
                content: skillsList(applicant.skills),
                className: "max-w-48",
              })}
              {cell(`${applicant.backendPreference}/5`, {
                className: "text-center",
              })}
              {cell(`${applicant.frontendExperience}/5`, {
                className: "text-center",
              })}
              {cell(`${applicant.backendExperience}/5`, {
                className: "text-center",
              })}
              {cell(`${applicant.designExperience}/5`, {
                className: "text-center",
              })}
              {cell(`${applicant.testingExperience}/5`, {
                className: "text-center",
              })}
              {cell(applicant.projectChoices.join(", "), {
                title: "Project choices",
                content: choicesList(applicant.projectChoices),
                className: "max-w-48",
              })}
              {cell(applicant.isMember ? "Yes" : "No")}
              {choiceRankFor &&
                cell(
                  choiceRankFor(applicant) === 0
                    ? "—"
                    : String(choiceOrder(choiceRankFor(applicant))),
                  { className: "text-center" }
                )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {dialog}
    </>
  );
}
