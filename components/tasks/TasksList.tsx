"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import type { TaskStatus } from "@/lib/types";
import { statusTasks } from "@/lib/tasks/utils";
import { TaskRow } from "@/components/tasks/TaskRow";

const SECTIONS: { status: TaskStatus; label: string }[] = [
  { status: "active", label: "In progress" },
  { status: "backlog", label: "Backlog" },
  { status: "done", label: "Done" },
];

function Section({
  label,
  tasks,
  userById,
  onOpenDetail,
  onToggleDone,
  onMoveTo,
}: {
  label: string;
  tasks: ClientTask[];
  userById: Map<string, BoardUser>;
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
        className="text-muted-foreground hover:text-foreground col-span-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wide uppercase"
      >
        <ChevronDown
          className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
        />
        {label}
        <span className="tabular-nums">{tasks.length}</span>
      </button>
      {open &&
        (tasks.length ? (
          <div className="divide-foreground/10 col-span-full grid grid-cols-subgrid gap-y-0 divide-y">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                userById={userById}
                onOpenDetail={onOpenDetail}
                onToggleDone={onToggleDone}
                onMoveTo={onMoveTo}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground col-span-full px-2 py-1.5 text-sm">
            Nothing here.
          </p>
        ))}
    </section>
  );
}

export function TasksList({
  tasks,
  users,
  onOpenDetail,
  onToggleDone,
  onMoveTo,
}: {
  tasks: ClientTask[];
  users: BoardUser[];
  onOpenDetail: (task: ClientTask) => void;
  onToggleDone: (task: ClientTask) => void;
  onMoveTo: (task: ClientTask, toCol: string) => void;
}) {
  const userById = useMemo(
    () => new Map(users.map((m) => [m.email, m])),
    [users]
  );
  const byStatus = useMemo(
    () => SECTIONS.map((s) => ({ ...s, tasks: statusTasks(tasks, s.status) })),
    [tasks]
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
      {/* One grid for all three sections, nested through subgrid, so the badge
          columns line up down the whole list and not just within a section. */}
      <div className="grid grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] gap-y-4 sm:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto_auto_auto_auto_auto_auto]">
        {byStatus.map((s) => (
          <Section
            key={s.status}
            label={s.label}
            tasks={s.tasks}
            userById={userById}
            onOpenDetail={onOpenDetail}
            onToggleDone={onToggleDone}
            onMoveTo={onMoveTo}
          />
        ))}
      </div>
    </div>
  );
}
