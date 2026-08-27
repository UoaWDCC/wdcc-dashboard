"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import type { BoardUser, ClientTask, TaskView } from "@/lib/tasks/types";
import type { TagView } from "@/lib/tags/types";
import { useBoardSync } from "@/hooks/tasks/use-board-sync";
import {
  taskKeys,
  useTasksQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
} from "@/hooks/tasks/use-tasks";
import { BoardSyncStatus } from "@/components/tasks/BoardSyncStatus";
import { TasksKanban } from "@/components/tasks/TasksKanban";
import { TagManagerDialog } from "@/components/tasks/TagManagerDialog";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";

export default function TasksView({
  initialTasks,
  initialVersion,
  users,
  tags,
  defaultTeam = null,
}: {
  initialTasks: TaskView[];
  initialVersion: string;
  users: BoardUser[];
  tags: TagView[];
  defaultTeam?: Team | null;
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
  const [teamFilter, setTeamFilter] = useState<Team | null>(defaultTeam);

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

  function openDetail(t: ClientTask) {
    setDetailTaskId(t.id);
    setDialogOpen(true);
  }

  const updateMutation = useUpdateTaskMutation(tagIdByName);
  const createMutation = useCreateTaskMutation();
  const deleteMutation = useDeleteTaskMutation();
  const moveMutation = useMoveTaskMutation();

  const detailTask = useMemo(
    () => tasks.find((t) => t.id === detailTaskId) ?? null,
    [tasks, detailTaskId]
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
          <BoardSyncStatus probe={sync.probe} />
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
      <TasksKanban
        tasks={visibleTasks}
        users={visibleUsers}
        onMove={moveMutation.mutate}
        onOpenDetail={openDetail}
        activeTaskId={activeTaskId}
        setActiveTaskId={setActiveTaskId}
      />
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
