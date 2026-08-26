"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TEAMS, type Team } from "@/lib/types";
import type {
  BoardData,
  BoardMeta,
  BoardUser,
  ClientTask,
  ColumnMeta,
  TaskView,
} from "@/lib/tasks/types";
import type { TagView } from "@/lib/tags/types";
import { userColId, colTasks } from "@/lib/tasks/utils";
import { useTaskDragDrop } from "@/hooks/tasks/use-task-drag-drop";
import {
  taskKeys,
  useBoardMetaQuery,
  useTasksQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
} from "@/hooks/tasks/use-tasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskColumn } from "@/components/tasks/TaskColumn";
import { TagManagerDialog } from "@/components/tasks/TagManagerDialog";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";

export default function TasksBoard({
  initialTasks,
  users,
  tags,
  defaultTeam = null,
}: {
  initialTasks: TaskView[];
  users: BoardUser[];
  tags: TagView[];
  defaultTeam?: Team | null;
}) {
  const queryClient = useQueryClient();

  // The board read carries users and tags too; fan them out so they refresh
  // with every board refetch instead of staying frozen at the initial props.
  const onBoard = useCallback(
    (board: BoardData) => {
      queryClient.setQueryData<BoardMeta>(taskKeys.meta, {
        users: board.users,
        tags: board.tags,
      });
    },
    [queryClient]
  );

  const { data: tasks = [] } = useTasksQuery(initialTasks, onBoard);
  // skipToken widens data to optional; the seed doubles as the fallback.
  const { data: boardMeta = { users, tags } } = useBoardMetaQuery({
    users,
    tags,
  });
  const liveUsers = boardMeta.users;
  const liveTags = boardMeta.tags;

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState<Team | null>(defaultTeam);

  const userById = useMemo(
    () => new Map(liveUsers.map((m) => [m.email, m])),
    [liveUsers]
  );
  const tagIdByName = useMemo(
    () => new Map(liveTags.map((t) => [t.name, t.id])),
    [liveTags]
  );
  const tagSuggestions = useMemo(() => liveTags.map((t) => t.name), [liveTags]);

  const visibleUsers = useMemo(
    () =>
      teamFilter ? liveUsers.filter((m) => m.team === teamFilter) : liveUsers,
    [liveUsers, teamFilter]
  );
  const visibleTasks = useMemo(
    () =>
      teamFilter
        ? tasks.filter((t) => t.team === teamFilter || t.team === null)
        : tasks,
    [tasks, teamFilter]
  );

  const userMeta: ColumnMeta[] = useMemo(
    () =>
      visibleUsers.map((m) => ({
        id: userColId(m.email),
        label: m.name,
        accent: "neutral" as const,
      })),
    [visibleUsers]
  );
  const backlogMeta: ColumnMeta = {
    id: "backlog",
    label: "Backlog",
    accent: "blue",
  };
  const doneMeta: ColumnMeta = { id: "done", label: "Done", accent: "green" };

  function openEdit(t: ClientTask) {
    setEditingTaskId(t.id);
    setDialogOpen(true);
  }

  const updateMutation = useUpdateTaskMutation(tagIdByName);
  const createMutation = useCreateTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const moveMutation = useMoveTaskMutation();

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) ?? null,
    [tasks, editingTaskId]
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
  } = useTaskDragDrop({
    tasks,
    onMove: moveMutation.mutate,
  });

  const backlogTasks = useMemo(
    () => colTasks(visibleTasks, "backlog"),
    [visibleTasks]
  );
  const doneTasksList = useMemo(
    () => colTasks(visibleTasks, "done"),
    [visibleTasks]
  );
  const userTasksByCol = useMemo(() => {
    const m: Record<string, ClientTask[]> = {};
    for (const meta of userMeta) m[meta.id] = colTasks(visibleTasks, meta.id);
    return m;
  }, [visibleTasks, userMeta]);
  const ongoingTasksCount = useMemo(
    () =>
      Object.values(userTasksByCol).reduce((sum, list) => sum + list.length, 0),
    [userTasksByCol]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <Select
            value={teamFilter ?? "all"}
            onValueChange={(v) =>
              setTeamFilter(v === "all" ? null : (v as Team))
            }
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {TEAMS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-muted-foreground text-xs">
            {visibleTasks.length} tasks · {visibleUsers.length} users
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTagManagerOpen(true)}
          >
            Manage tags
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New task
          </Button>
        </div>
      </div>
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
            onEditTask={openEdit}
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
                    onEditTask={openEdit}
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
            onEditTask={openEdit}
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
      <TaskCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(input) =>
          createMutation.mutate({
            title: input.title,
            description: input.description ?? undefined,
            priority: input.priority ?? undefined,
            team: input.team ?? undefined,
            dueDate: input.dueDate ?? undefined,
            tagIds: input.tags
              .map((name) => tagIdByName.get(name))
              .filter((id): id is string => !!id),
            links: input.links.map((l) => ({
              url: l.url,
              title: l.title ?? undefined,
            })),
            assigneeEmails: input.assigneeEmails,
          })
        }
        tagSuggestions={tagSuggestions}
        users={liveUsers}
      />
      <TagManagerDialog
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={liveTags}
        onChanged={() =>
          queryClient.invalidateQueries({ queryKey: taskKeys.all })
        }
      />
      <TaskEditDialog
        task={editingTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={(updated) => updateMutation.mutate({ next: updated })}
        onDelete={(id) => deleteMutation.mutate(id)}
        tagSuggestions={tagSuggestions}
        users={liveUsers}
      />
    </div>
  );
}
