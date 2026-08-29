"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TEAMS, type Team } from "@/lib/types";
import type { BoardUser, ClientTask, TaskView } from "@/lib/tasks/types";
import type { TagView } from "@/lib/tags/types";
import {
  filterQuery,
  filterTasks,
  taskColId,
  userColId,
  type ShareableFilters,
} from "@/lib/tasks/utils";
import { useBoardSync } from "@/hooks/tasks/use-board-sync";
import type { ViewMode } from "@/lib/tasks/view";
import { useViewMode } from "@/hooks/tasks/use-view-mode";
import {
  taskKeys,
  useTasksQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
  usePendingMoveTaskIds,
} from "@/hooks/tasks/use-tasks";
import { BoardSyncStatus } from "@/components/tasks/BoardSyncStatus";
import { FilterSelect } from "@/components/tasks/FilterSelect";
import { TasksKanban } from "@/components/tasks/TasksKanban";
import { TasksList } from "@/components/tasks/TasksList";
import { TagManagerDialog } from "@/components/tasks/TagManagerDialog";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";

const TEAM_OPTIONS = TEAMS.map((t) => ({ value: t, label: t }));

export default function TasksView({
  initialTasks,
  initialVersion,
  users,
  tags,
  defaultFilters,
  defaultView,
}: {
  initialTasks: TaskView[];
  initialVersion: string;
  users: BoardUser[];
  tags: TagView[];
  defaultFilters: ShareableFilters;
  defaultView: ViewMode;
}) {
  const queryClient = useQueryClient();

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sync = useBoardSync({
    initialVersion,
    initialMeta: { users, tags },
    dragging: activeTaskId !== null,
  });

  const { data: tasks = [] } = useTasksQuery(initialTasks, sync.onBoard);
  const { users: liveUsers, tags: liveTags } = sync;

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>(defaultFilters.teams);
  const [tagFilter, setTagFilter] = useState<string[]>(defaultFilters.tags);
  const [peopleFilter, setPeopleFilter] = useState<string[]>([]);
  const [view, setView] = useViewMode(defaultView);

  const tagIdByName = useMemo(
    () => new Map(liveTags.map((t) => [t.name, t.id])),
    [liveTags]
  );
  const tagSuggestions = useMemo(() => liveTags.map((t) => t.name), [liveTags]);
  const tagOptions = useMemo(
    () => tagSuggestions.map((name) => ({ value: name, label: name })),
    [tagSuggestions]
  );
  const activeTags = useMemo(
    () => tagFilter.filter((name) => tagIdByName.has(name)),
    [tagFilter, tagIdByName]
  );
  const peopleOptions = useMemo(
    () => liveUsers.map((m) => ({ value: m.email, label: m.name })),
    [liveUsers]
  );
  const activePeople = useMemo(
    () => peopleFilter.filter((e) => liveUsers.some((m) => m.email === e)),
    [peopleFilter, liveUsers]
  );

  // Teams and people both narrow the board's columns, and they intersect —
  // filtering to a team plus someone outside it legitimately leaves no user
  // columns at all.
  const visibleUsers = useMemo(
    () =>
      !teams.length && !activePeople.length
        ? liveUsers
        : liveUsers.filter(
            (m) =>
              (!teams.length || (m.team && teams.includes(m.team))) &&
              (!activePeople.length || activePeople.includes(m.email))
          ),
    [liveUsers, teams, activePeople]
  );
  const visibleTasks = useMemo(
    () => filterTasks(tasks, { teams, tags: activeTags, people: activePeople }),
    [tasks, teams, activeTags, activePeople]
  );

  // Mirror the shareable filters into the URL so a filtered board is a link you
  // can paste. `history.replaceState` on purpose: `router.replace` would re-run
  // the page's server queries on every checkbox, and `pushState` would bury the
  // back button under one entry per toggle. The people filter is deliberately
  // absent — see `parseFilters`.
  useEffect(() => {
    const query = filterQuery({ teams, tags: activeTags });
    if (query === window.location.search.replace(/^\?/, "")) return;
    window.history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname
    );
  }, [teams, activeTags]);

  function openDetail(t: ClientTask) {
    setDetailTaskId(t.id);
    setDialogOpen(true);
  }

  const updateMutation = useUpdateTaskMutation(tagIdByName);
  const createMutation = useCreateTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const moveMutation = useMoveTaskMutation();
  const pendingMoveTaskIds = usePendingMoveTaskIds();

  // A done row reopens into its first assignee's column, or the backlog when
  // it has none.
  function toggleDone(t: ClientTask) {
    const fromCol = taskColId(t);
    const toCol =
      t.status === "done"
        ? t.assignees[0]
          ? userColId(t.assignees[0].profileEmail)
          : "backlog"
        : "done";
    moveMutation.mutate({ taskId: t.id, fromCol, toCol });
  }

  // `from: backlog` on purpose: a user `from` would only drop that one
  // assignee, leaving a multi-assignee task active. The list means "send it
  // back", so the non-user branch wipes them all.
  function moveTo(t: ClientTask, toCol: string) {
    const fromCol = toCol === "backlog" ? "backlog" : taskColId(t);
    moveMutation.mutate({ taskId: t.id, fromCol, toCol });
  }

  const detailTask = useMemo(
    () => tasks.find((t) => t.id === detailTaskId) ?? null,
    [tasks, detailTaskId]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <div className="flex items-center rounded-md border p-0.5">
            {[
              { id: "list" as const, Icon: List, label: "List view" },
              { id: "board" as const, Icon: LayoutGrid, label: "Board view" },
            ].map(({ id, Icon, label }) => (
              <Button
                key={id}
                size="sm"
                variant={view === id ? "secondary" : "ghost"}
                aria-label={label}
                aria-pressed={view === id}
                disabled={activeTaskId !== null}
                onClick={() => setView(id)}
                className="size-7 p-0"
              >
                <Icon className="size-4" />
              </Button>
            ))}
          </div>
          <FilterSelect
            label="Teams"
            options={TEAM_OPTIONS}
            selected={teams}
            onChange={setTeams}
          />
          {tagOptions.length > 0 && (
            <FilterSelect
              label="Tags"
              options={tagOptions}
              selected={activeTags}
              onChange={setTagFilter}
            />
          )}
          <FilterSelect
            label="People"
            options={peopleOptions}
            selected={activePeople}
            onChange={setPeopleFilter}
          />
        </div>
        <div className="flex items-center gap-3">
          <BoardSyncStatus probe={sync.probe} />
          <p className="text-muted-foreground text-xs">
            {visibleTasks.length} tasks
            {view === "board" && ` · ${visibleUsers.length} users`}
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
      {view === "list" ? (
        <TasksList
          tasks={visibleTasks}
          users={liveUsers}
          pendingTaskIds={pendingMoveTaskIds}
          onOpenDetail={openDetail}
          onToggleDone={toggleDone}
          onMoveTo={moveTo}
        />
      ) : (
        <TasksKanban
          tasks={visibleTasks}
          users={visibleUsers}
          onMove={moveMutation.mutate}
          onOpenDetail={openDetail}
          activeTaskId={activeTaskId}
          setActiveTaskId={setActiveTaskId}
        />
      )}
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
      <TaskDetailDialog
        task={detailTask}
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
