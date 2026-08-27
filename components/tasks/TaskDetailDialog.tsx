"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  DUE_CLASS,
  dayMonth,
  dueLabel,
  dueState,
  getTodayIso,
} from "@/lib/date";
import { PRIORITY_DOT, PRIORITY_LABEL, type TaskStatus } from "@/lib/types";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import { useTaskForm, type TaskFormValues } from "@/hooks/tasks/use-task-form";
import { TaskFormFields } from "./TaskFormFields";

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: "Backlog",
  active: "In progress",
  done: "Done",
};

function taskToValues(task: ClientTask): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    tags: task.tags,
    links: task.links,
    linkDraft: "",
    dueDate: task.dueDate ?? "",
    priority: task.priority ?? "",
    team: task.team ?? "",
    assigneeEmails: task.assignees.map((a) => a.profileEmail),
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {children}
      </div>
    </div>
  );
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
  tagSuggestions,
  users,
}: {
  task: ClientTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: ClientTask) => void;
  onDelete: (id: string) => void;
  tagSuggestions: string[];
  users: BoardUser[];
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Every open starts read-only, and a different task never inherits the last
  // one's mode.
  const openKey = open ? (task?.id ?? null) : null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode("view");
  }, [openKey]);

  const initial = useMemo(() => (task ? taskToValues(task) : null), [task]);
  // Keyed on the mode too, so Cancel discards and a later Edit re-seeds from
  // the task rather than resuming the abandoned draft.
  const form = useTaskForm(initial, open ? `${task?.id}:${mode}` : null);
  const { values, finalLinks } = form;

  const today = getTodayIso();
  const userByEmail = useMemo(
    () => new Map(users.map((u) => [u.email, u])),
    [users]
  );

  function handleSave() {
    if (!task) return;
    const trimmed = values.title.trim();
    if (!trimmed) return;
    onSave({
      ...task,
      title: trimmed,
      description: values.description.trim() || null,
      tags: values.tags,
      links: finalLinks(),
      dueDate: values.dueDate || null,
      priority: values.priority || null,
      team: values.team || null,
      assignees: values.assigneeEmails.map((email) => ({
        profileEmail: email,
      })),
    });
    setMode("view");
  }

  function handleDelete() {
    if (!task) return;
    onDelete(task.id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            {mode === "edit" ? "Edit task" : (task?.title ?? "Task")}
            {task && (
              <span className="text-muted-foreground text-sm font-normal tabular-nums">
                #{task.number}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "edit" ? (
          <TaskFormFields
            form={form}
            idPrefix="task"
            tagSuggestions={tagSuggestions}
            users={users}
            assigneesDisabled={task?.status === "done"}
          />
        ) : task ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant="outline">{STATUS_LABEL[task.status]}</Badge>
              {task.priority && (
                <Badge variant="outline" className="gap-1.5">
                  <span
                    className={cn(
                      "inline-block size-2 shrink-0 rounded-full",
                      PRIORITY_DOT[task.priority]
                    )}
                  />
                  {PRIORITY_LABEL[task.priority]}
                </Badge>
              )}
              {task.team && <Badge variant="outline">{task.team}</Badge>}
              {task.dueDate && (
                <Badge
                  variant="outline"
                  className={cn(DUE_CLASS[dueState(task.dueDate, today)])}
                >
                  {dueLabel(task.dueDate, today)}
                </Badge>
              )}
              {task.completedAt && (
                <Badge variant="outline" className="text-muted-foreground">
                  Done {dayMonth(task.completedAt)}
                </Badge>
              )}
            </div>

            <Field label="Description">
              {task.description ? (
                <p className="whitespace-pre-wrap">{task.description}</p>
              ) : (
                <span className="text-muted-foreground">No description.</span>
              )}
            </Field>

            <Field label="Assignees">
              {task.assignees.length ? (
                task.assignees.map((a) => (
                  <Badge
                    key={a.profileEmail}
                    className="bg-brand-blue/15 text-brand-blue"
                  >
                    {userByEmail.get(a.profileEmail)?.name ?? a.profileEmail}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">Unassigned.</span>
              )}
            </Field>

            <Field label="Tags">
              {task.tags.length ? (
                task.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground">No tags.</span>
              )}
            </Field>

            <Field label="Links">
              {task.links.length ? (
                <ul className="flex w-full flex-col gap-1">
                  {task.links.map((l) => (
                    <li key={l.id ?? l.url} className="min-w-0">
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-blue inline-flex min-w-0 items-center gap-1.5 hover:underline"
                      >
                        <Link2 className="size-3.5 shrink-0" />
                        <span className="truncate">{l.title ?? l.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">No links.</span>
              )}
            </Field>
          </div>
        ) : null}

        {mode === "edit" ? (
          <DialogFooter className="sm:justify-between">
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setMode("view")}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!values.title.trim()}>
                Save
              </Button>
            </div>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => setMode("edit")} disabled={!task}>
              Edit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
