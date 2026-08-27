"use client";

import { Check, Link2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DUE_CLASS,
  dayMonth,
  dueLabel,
  dueState,
  getTodayIso,
} from "@/lib/date";
import { PRIORITY_DOT, PRIORITY_LABEL } from "@/lib/types";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";

export function TaskRow({
  task,
  userById,
  pending = false,
  onOpenDetail,
  onToggleDone,
  onMoveTo,
}: {
  task: ClientTask;
  userById: Map<string, BoardUser>;
  pending?: boolean;
  onOpenDetail: (task: ClientTask) => void;
  onToggleDone: (task: ClientTask) => void;
  onMoveTo: (task: ClientTask, toCol: string) => void;
}) {
  const today = getTodayIso();
  const done = task.status === "done";
  // Below `sm` the cluster wraps to its own line, so the tag list is trimmed
  // there and shown in full from `sm` up.
  const hiddenTagCount = Math.max(0, task.tags.length - 2);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(task)}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onOpenDetail(task);
      }}
      className="hover:bg-accent/50 focus-visible:ring-ring col-span-full grid cursor-pointer grid-cols-subgrid items-center gap-x-2 gap-y-1 rounded-md px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
    >
      <button
        type="button"
        aria-label={done ? "Reopen task" : "Mark done"}
        aria-pressed={done}
        disabled={pending}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
        className={cn(
          "border-foreground/25 hover:border-foreground/50 flex size-4 shrink-0 items-center justify-center rounded-full border disabled:opacity-50",
          done && "border-emerald-500 bg-emerald-500 text-white"
        )}
      >
        {done && <Check className="size-3" />}
      </button>

      {task.priority ? (
        <span
          aria-label={PRIORITY_LABEL[task.priority]}
          title={PRIORITY_LABEL[task.priority]}
          className={cn(
            "inline-block size-2 shrink-0 rounded-full",
            PRIORITY_DOT[task.priority]
          )}
        />
      ) : (
        // Spacer, so titles stay aligned whether or not a priority is set.
        <span className="inline-block size-2 shrink-0" />
      )}

      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
        #{task.number}
      </span>
      <span
        className={cn(
          "min-w-0 truncate font-medium",
          done && "text-muted-foreground line-through"
        )}
      >
        {task.title}
      </span>

      {/* One flex line below `sm`; from `sm` up `contents` drops the wrapper so
          each cell lands in the parent grid's own track and columns align. */}
      <div className="col-span-full flex flex-wrap items-center gap-1 pl-8 sm:contents">
        <span className="flex items-center">
          {done ? (
            task.completedAt && (
              <Badge
                variant="outline"
                className="text-muted-foreground text-[10px]"
              >
                Done {dayMonth(task.completedAt)}
              </Badge>
            )
          ) : task.dueDate ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                DUE_CLASS[dueState(task.dueDate, today)]
              )}
            >
              {dueLabel(task.dueDate, today)}
            </Badge>
          ) : null}
        </span>

        <span className="hidden items-center sm:flex">
          {task.team && (
            <Badge variant="outline" className="text-[10px]">
              {task.team}
            </Badge>
          )}
        </span>

        <span className="flex items-center gap-1">
          {task.tags.map((t, i) => (
            <Badge
              key={t}
              variant="secondary"
              className={cn("text-[10px]", i >= 2 && "hidden sm:inline-flex")}
            >
              {t}
            </Badge>
          ))}
          {hiddenTagCount > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] tabular-nums sm:hidden"
            >
              +{hiddenTagCount}
            </Badge>
          )}
        </span>

        <span className="flex items-center gap-1">
          {task.assignees.map((a) => (
            <Badge
              key={`assignee-${a.profileEmail}`}
              className="bg-brand-blue/15 text-brand-blue text-[10px]"
            >
              {userById.get(a.profileEmail)?.name ?? a.profileEmail}
            </Badge>
          ))}
        </span>

        <span className="text-muted-foreground hidden items-center gap-0.5 text-[10px] sm:flex">
          {task.links.length ? (
            <span
              title={`${task.links.length} link${task.links.length === 1 ? "" : "s"}`}
              className="inline-flex items-center gap-0.5"
            >
              <Link2 className="size-3" />
              {task.links.length}
            </span>
          ) : null}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Move task"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="text-muted-foreground hover:text-foreground hover:bg-accent col-start-5 row-start-1 flex size-6 items-center justify-center rounded-md sm:col-start-auto sm:row-start-auto"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuLabel>Move to</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={pending || task.status === "backlog"}
            onSelect={() => onMoveTo(task, "backlog")}
          >
            Backlog
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending || done}
            onSelect={() => onMoveTo(task, "done")}
          >
            Done
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
