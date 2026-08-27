"use client";

import { useEffect, useMemo } from "react";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import type {
  BoardUser,
  ClientMoveTask,
  ClientTask,
  ColumnMeta,
} from "@/lib/tasks/types";
import { userColId, colTasks } from "@/lib/tasks/utils";
import { useTaskDragDrop } from "@/hooks/tasks/use-task-drag-drop";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskColumn } from "@/components/tasks/TaskColumn";

export function TasksKanban({
  tasks,
  users,
  onMove,
  onOpenDetail,
  activeTaskId,
  setActiveTaskId,
}: {
  tasks: ClientTask[];
  users: BoardUser[];
  onMove: (input: ClientMoveTask) => void;
  onOpenDetail: (task: ClientTask) => void;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}) {
  // Unmounting mid-drag never fires onDragEnd/onDragCancel, so the shell's
  // activeTaskId would pin the sync poll's pause gate on forever.
  useEffect(() => () => setActiveTaskId(null), [setActiveTaskId]);

  const userById = useMemo(
    () => new Map(users.map((m) => [m.email, m])),
    [users]
  );

  const userMeta: ColumnMeta[] = useMemo(
    () =>
      users.map((m) => ({
        id: userColId(m.email),
        label: m.name,
        accent: "neutral" as const,
      })),
    [users]
  );
  const backlogMeta: ColumnMeta = {
    id: "backlog",
    label: "Backlog",
    accent: "blue",
  };
  const doneMeta: ColumnMeta = { id: "done", label: "Done", accent: "green" };

  const backlogTasks = useMemo(() => colTasks(tasks, "backlog"), [tasks]);
  const doneTasksList = useMemo(() => colTasks(tasks, "done"), [tasks]);
  const userTasksByCol = useMemo(() => {
    const m: Record<string, ClientTask[]> = {};
    for (const meta of userMeta) m[meta.id] = colTasks(tasks, meta.id);
    return m;
  }, [tasks, userMeta]);
  const ongoingTasksCount = useMemo(
    () =>
      Object.values(userTasksByCol).reduce((sum, list) => sum + list.length, 0),
    [userTasksByCol]
  );

  const {
    sensors,
    collisionDetection,
    activeTask,
    activeWidth,
    activeColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useTaskDragDrop({ tasks, onMove, activeTaskId, setActiveTaskId });

  return (
    <DndContext
      id="tasks"
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-1 min-h-0 gap-3">
        <TaskColumn
          meta={backlogMeta}
          tasks={backlogTasks}
          className="w-64 shrink-0"
          userById={userById}
          onOpenDetail={onOpenDetail}
        />
        <section className="flex min-w-0 flex-1 flex-col rounded-lg ring-1 ring-brand-blue/50 bg-brand-blue/10">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-blue/30">
            <h2 className="text-sm font-semibold tracking-tight text-brand-blue">
              Ongoing Tasks
            </h2>
            <span className="bg-brand-blue text-white text-xs tabular-nums rounded-md px-1.5 py-0.5">
              {ongoingTasksCount}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
              {userMeta.map((m) => (
                <TaskColumn
                  key={m.id}
                  meta={m}
                  tasks={userTasksByCol[m.id] ?? []}
                  userById={userById}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          </div>
        </section>
        <TaskColumn
          meta={doneMeta}
          tasks={doneTasksList}
          className="w-64 shrink-0"
          userById={userById}
          onOpenDetail={onOpenDetail}
        />
      </div>
      <DragOverlay>
        {activeTask ? (
          <div style={{ width: activeWidth ?? undefined }}>
            <TaskCard
              task={activeTask}
              columnId={activeColumnId ?? undefined}
              userById={userById}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
