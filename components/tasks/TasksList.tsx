"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import type { TaskListScope } from "@/lib/tasks/view";
import { STATUS_TEXT, type TaskStatus } from "@/lib/types";
import { statusTasks, usersById } from "@/lib/tasks/utils";
import { TaskRow } from "@/components/tasks/TaskRow";

const SECTIONS: { status: TaskStatus; label: string }[] = [
  { status: "active", label: "In progress" },
  { status: "backlog", label: "Backlog" },
  { status: "done", label: "Done" },
];

const EMPTY_MESSAGES: Record<TaskStatus, string> = {
  active: "No tasks in progress.",
  backlog: "The backlog is empty.",
  done: "No completed tasks.",
};

type TaskRowsProps = {
  tasks: ClientTask[];
  userById: Map<string, BoardUser>;
  pendingTaskIds: Set<string>;
  onOpenDetail: (task: ClientTask) => void;
  onToggleDone: (task: ClientTask) => void;
  onMoveTo: (task: ClientTask, toCol: string) => void;
  emptyMessage: string;
};

function TaskRows({
  tasks,
  userById,
  pendingTaskIds,
  onOpenDetail,
  onToggleDone,
  onMoveTo,
  emptyMessage,
}: TaskRowsProps) {
  if (!tasks.length) {
    return (
      <p className="text-muted-foreground col-span-full px-2 py-1.5 text-sm">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="divide-foreground/10 col-span-full grid grid-cols-subgrid gap-y-0 divide-y">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          userById={userById}
          pending={pendingTaskIds.has(task.id)}
          onOpenDetail={onOpenDetail}
          onToggleDone={onToggleDone}
          onMoveTo={onMoveTo}
        />
      ))}
    </div>
  );
}

function Section({
  status,
  label,
  tasks,
  userById,
  pendingTaskIds,
  onOpenDetail,
  onToggleDone,
  onMoveTo,
}: {
  status: TaskStatus;
  label: string;
  tasks: ClientTask[];
  userById: Map<string, BoardUser>;
  pendingTaskIds: Set<string>;
  onOpenDetail: (task: ClientTask) => void;
  onToggleDone: (task: ClientTask) => void;
  onMoveTo: (task: ClientTask, toCol: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="col-span-full grid grid-cols-subgrid gap-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "col-span-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wide uppercase",
          STATUS_TEXT[status]
        )}
      >
        <ChevronDown
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
        {label}
        <span className="tabular-nums">{tasks.length}</span>
      </button>
      {open && (
        <TaskRows
          tasks={tasks}
          userById={userById}
          pendingTaskIds={pendingTaskIds}
          onOpenDetail={onOpenDetail}
          onToggleDone={onToggleDone}
          onMoveTo={onMoveTo}
          emptyMessage="Nothing here."
        />
      )}
    </section>
  );
}

export function TasksList({
  scope,
  tasks,
  users,
  pendingTaskIds,
  onOpenDetail,
  onToggleDone,
  onMoveTo,
}: {
  scope: TaskListScope;
  tasks: ClientTask[];
  users: BoardUser[];
  pendingTaskIds: Set<string>;
  onOpenDetail: (task: ClientTask) => void;
  onToggleDone: (task: ClientTask) => void;
  onMoveTo: (task: ClientTask, toCol: string) => void;
}) {
  const userById = useMemo(() => usersById(users), [users]);
  const byStatus = useMemo(
    () =>
      scope === "all"
        ? SECTIONS.map((s) => ({
            ...s,
            tasks: statusTasks(tasks, s.status),
          }))
        : [],
    [scope, tasks]
  );
  const scopedTasks = useMemo(
    () => (scope === "all" ? [] : statusTasks(tasks, scope)),
    [scope, tasks]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* One grid for all sections, nested through subgrid, so the badge
          columns line up down the whole list and not just within a section. */}
      <div className="grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] gap-y-4 sm:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_auto_auto_auto_auto_auto]">
        {scope === "all" ? (
          byStatus.map((section) => (
            <Section
              key={section.status}
              status={section.status}
              label={section.label}
              tasks={section.tasks}
              userById={userById}
              pendingTaskIds={pendingTaskIds}
              onOpenDetail={onOpenDetail}
              onToggleDone={onToggleDone}
              onMoveTo={onMoveTo}
            />
          ))
        ) : (
          <TaskRows
            tasks={scopedTasks}
            userById={userById}
            pendingTaskIds={pendingTaskIds}
            onOpenDetail={onOpenDetail}
            onToggleDone={onToggleDone}
            onMoveTo={onMoveTo}
            emptyMessage={EMPTY_MESSAGES[scope]}
          />
        )}
      </div>
    </div>
  );
}
