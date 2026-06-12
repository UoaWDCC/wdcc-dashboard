"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type TaskView } from "@/server/tasks/actions";
import type {
	BoardUser,
	TagOption,
	ClientTask,
	ColumnMeta,
} from "@/lib/tasks/types";
import { userColId, colTasks } from "@/lib/tasks/utils";
import { useTaskDragDrop } from "@/hooks/use-task-drag-drop";
import {
	taskKeys,
	useTasksQuery,
	useUpdateTaskMutation,
	useCreateTaskMutation,
	useDeleteTaskMutation,
	useMoveTaskMutation,
} from "@/lib/tasks/queries";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskColumn } from "@/components/tasks/TaskColumn";
import { TagManagerDialog } from "@/components/tasks/TagManagerDialog";
import { TaskCreateDialog } from "@/components/tasks/TaskCreateDialog";
import { TaskEditDialog } from "@/components/tasks/TaskEditDialog";

export default function TasksBoard({
	initialTasks,
	users,
	tags,
}: {
	initialTasks: TaskView[];
	users: BoardUser[];
	tags: TagOption[];
}) {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: tasks = [] } = useTasksQuery(initialTasks);

	const setTasks = useCallback(
		(updater: ClientTask[] | ((prev: ClientTask[]) => ClientTask[])) => {
			queryClient.setQueryData<ClientTask[]>(taskKeys.all, (prev) => {
				const base = prev ?? [];
				return typeof updater === "function" ? updater(base) : updater;
			});
		},
		[queryClient]
	);

	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [tagManagerOpen, setTagManagerOpen] = useState(false);

	const userById = useMemo(
		() => new Map(users.map((m) => [m.email, m])),
		[users]
	);
	const tagIdByName = useMemo(
		() => new Map(tags.map((t) => [t.name, t.id])),
		[tags]
	);
	const tagSuggestions = useMemo(() => tags.map((t) => t.name), [tags]);

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

	function openEdit(t: ClientTask) {
		setEditingTaskId(t.id);
		setDialogOpen(true);
	}

	const updateMutation = useUpdateTaskMutation(tagIdByName);
	const createMutation = useCreateTaskMutation(tagIdByName);
	const deleteMutation = useDeleteTaskMutation();
	const moveMutation = useMoveTaskMutation();

	const editingTask = useMemo(
		() => tasks.find((t) => t.id === editingTaskId) ?? null,
		[tasks, editingTaskId]
	);

	const { sensors, collisionDetection, activeTask, handleDragStart, handleDragEnd, handleDragCancel } =
		useTaskDragDrop({
			tasks,
			setTasks,
			persistMove: (input) => moveMutation.mutateAsync(input),
		});

	const backlogTasks = useMemo(() => colTasks(tasks, "backlog"), [tasks]);
	const doneTasksList = useMemo(() => colTasks(tasks, "done"), [tasks]);
	const userTasksByCol = useMemo(() => {
		const m: Record<string, ClientTask[]> = {};
		for (const meta of userMeta) m[meta.id] = colTasks(tasks, meta.id);
		return m;
	}, [tasks, userMeta]);

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Tasks</h1>
				<div className="flex items-center gap-3">
					<p className="text-muted-foreground text-xs">
						{tasks.length} tasks · {users.length} users
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
								{users.length}
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
						<TaskCard task={activeTask} userById={userById} />
					) : null}
				</DragOverlay>
			</DndContext>
			<TaskCreateDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				onCreate={(input) => createMutation.mutate(input)}
				tagSuggestions={tagSuggestions}
				users={users}
			/>
			<TagManagerDialog
				open={tagManagerOpen}
				onOpenChange={setTagManagerOpen}
				tags={tags}
				onChanged={() => router.refresh()}
			/>
			<TaskEditDialog
				task={editingTask}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={(updated) => updateMutation.mutate({ next: updated })}
				onDelete={(id) => deleteMutation.mutate(id)}
				tagSuggestions={tagSuggestions}
				users={users}
			/>
		</div>
	);
}
