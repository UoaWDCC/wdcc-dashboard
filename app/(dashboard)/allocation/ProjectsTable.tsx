"use client";

import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import type { Project } from "@/lib/allocation/types";

import { textPopup, useExpandableCell } from "./useExpandableCell";
import { useSortableRows } from "./useSortableRows";

export function ProjectsTable({ projects }: { projects: Project[] }) {
  const { cell, dialog } = useExpandableCell();
  const { head, sortedRows } = useSortableRows(projects);

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No projects uploaded yet.</p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {head("Project", "name", (p) => p.name)}
            {head(
              "BE weighting",
              "backendWeighting",
              (p) => p.backendWeighting,
              "text-center"
            )}
            {head(
              "Beginner/exp.",
              "priority",
              (p) => p.priority,
              "text-center"
            )}
            {head(
              "FE difficulty",
              "frontendDifficulty",
              (p) => p.frontendDifficulty,
              "text-center"
            )}
            {head(
              "BE difficulty",
              "backendDifficulty",
              (p) => p.backendDifficulty,
              "text-center"
            )}
            {head(
              "Designers needed",
              "designersNeeded",
              (p) => p.designersNeeded
            )}
            {head("Notes", "notes", (p) => p.notes)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRows.map((project) => (
            <TableRow key={project.id}>
              {cell(project.name, {
                title: "Project name",
                content: textPopup(project.name),
                className: "max-w-48 font-medium",
              })}
              {cell(`${project.backendWeighting}/5`, {
                className: "text-center",
              })}
              {cell(`${project.priority}/5`, { className: "text-center" })}
              {cell(`${project.frontendDifficulty}/5`, {
                className: "text-center",
              })}
              {cell(`${project.backendDifficulty}/5`, {
                className: "text-center",
              })}
              {cell(project.designersNeeded, {
                title: "Designers needed",
                content: textPopup(project.designersNeeded),
              })}
              {cell(project.notes, {
                title: "Notes",
                content: textPopup(project.notes),
                className: "max-w-48 text-muted-foreground",
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {dialog}
    </>
  );
}
