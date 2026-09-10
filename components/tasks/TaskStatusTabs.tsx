"use client";

import { Button } from "@/components/ui/button";
import type { TaskListScope } from "@/lib/tasks/view";
import type { TaskStatus } from "@/lib/types";

const OPTIONS: { value: TaskListScope; label: string }[] = [
  { value: "active", label: "In progress" },
  { value: "backlog", label: "Backlog" },
  { value: "done", label: "Done" },
  { value: "all", label: "All" },
];

export type TaskStatusCounts = Record<TaskStatus, number>;

export function TaskStatusTabs({
  value,
  counts,
  onChange,
}: {
  value: TaskListScope;
  counts: TaskStatusCounts;
  onChange: (next: TaskListScope) => void;
}) {
  const allCount = counts.active + counts.backlog + counts.done;

  return (
    <div className="w-fit min-w-0 max-w-full overflow-x-auto">
      <div
        role="group"
        aria-label="Task status view"
        className="flex min-w-max items-center rounded-md border p-0.5"
      >
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={value === option.value ? "secondary" : "ghost"}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className="h-7 gap-1.5 px-2.5 text-xs"
          >
            {option.label}
            <span className="text-muted-foreground tabular-nums">
              {option.value === "all" ? allCount : counts[option.value]}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
