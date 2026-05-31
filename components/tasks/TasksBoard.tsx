"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	createTask,
	moveTask,
	softDeleteTask,
	updateTask,
	type TaskView,
} from "@/server/tasks/actions";
import {
	type TaskPriority as Priority,
	type Team,
} from "@/lib/types";
import type {
	BoardUser,
	TagOption,
	ClientTask,
	ColumnMeta,
} from "@/lib/tasks/types";
import {
	userColId,
	colIdToColumnId,
	fromServer,
	colTasks,
} from "@/lib/tasks/utils";
import { useTaskDragDrop } from "@/hooks/use-task-drag-drop";
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
	const [, startTransition] = useTransition();
	const [tasks, setTasks] = useState<ClientTask[]>(() => fromServer(initialTasks));
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [tagManagerOpen, setTagManagerOpen] = useState(false);
	// In-flight mutation counter. router.refresh() pushes new initialTasks while
	// optimistic state for a later drag may still be settling — applying server
	// state then clobbers it. Defer the reset until mutations drain.
	const pendingMutations = useRef(0);
	const pendingRefresh = useRef(false);

	useEffect(() => {
		if (pendingMutations.current > 0) {
			pendingRefresh.current = true;
			return;
		}
		setTasks(fromServer(initialTasks));
	}, [initialTasks]);

	function trackMutation<T>(fn: () => Promise<T>): Promise<T> {
		pendingMutations.current += 1;
		return fn().finally(() => {
			pendingMutations.current -= 1;
			if (pendingMutations.current === 0 && pendingRefresh.current) {
				pendingRefresh.current = false;
				router.refresh();
			}
		});
	}

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

	function persistUpdate(prev: ClientTask, next: ClientTask) {
		const newAssigneeEmails = next.assignees.map((a) => a.profileEmail);
		setTasks((all) =>
			all.map((t) =>
				t.id === next.id
					? {
							...next,
							status:
								t.status === "done"
									? "done"
									: newAssigneeEmails.length > 0
										? "active"
										: "backlog",
						}
					: t
			)
		);
		startTransition(() => {
			trackMutation(async () => {
				try {
					await updateTask(next.id, {
						title: next.title,
						description: next.description,
						priority: next.priority,
						team: next.team,
						tagIds: next.tags
							.map((name) => tagIdByName.get(name))
							.filter((id): id is string => !!id),
						links: next.links.map((l) => ({ url: l.url, title: l.title })),
						assigneeEmails: newAssigneeEmails,
					});
					router.refresh();
				} catch (e) {
					console.error("updateTask failed", e);
					setTasks((all) => all.map((t) => (t.id === prev.id ? prev : t)));
				}
			});
		});
	}

	function persistCreate(input: {
		title: string;
		description: string | null;
		priority: Priority | null;
		team: Team | null;
		tags: string[];
		links: { url: string; title: string | null }[];
		assigneeEmails: string[];
	}) {
		startTransition(() => {
			trackMutation(async () => {
				try {
					await createTask({
						title: input.title,
						description: input.description ?? undefined,
						priority: input.priority ?? undefined,
						team: input.team ?? undefined,
						tagIds: input.tags
							.map((name) => tagIdByName.get(name))
							.filter((id): id is string => !!id),
						links: input.links.map((l) => ({
							url: l.url,
							title: l.title ?? undefined,
						})),
						assigneeEmails: input.assigneeEmails,
					});
					router.refresh();
				} catch (e) {
					console.error("createTask failed", e);
				}
			});
		});
	}

	function persistDelete(id: string) {
		const deleted = tasks.find((t) => t.id === id);
		if (!deleted) return;
		setTasks((all) => all.filter((t) => t.id !== id));
		startTransition(() => {
			trackMutation(async () => {
				try {
					await softDeleteTask(id);
					router.refresh();
				} catch (e) {
					console.error("softDeleteTask failed", e);
					setTasks((all) =>
						all.some((t) => t.id === id) ? all : [...all, deleted]
					);
				}
			});
		});
	}

	const editingTask = useMemo(
		() => tasks.find((t) => t.id === editingTaskId) ?? null,
		[tasks, editingTaskId]
	);

	const { sensors, collisionDetection, activeTask, handleDragStart, handleDragEnd, handleDragCancel } =
		useTaskDragDrop({
			tasks,
			setTasks,
			persistMove: ({ taskId, fromCol, toCol, beforeId, afterId }) =>
				new Promise<void>((resolve, reject) => {
					startTransition(() => {
						trackMutation(async () => {
							try {
								await moveTask({
									taskId,
									from: colIdToColumnId(fromCol),
									to: colIdToColumnId(toCol),
									beforeId,
									afterId,
								});
								// Optimistic state already matches server ordering. Skip
								// router.refresh() here — it can clobber subsequent in-flight
								// drags. The next mutation (or focus return) re-syncs.
								resolve();
							} catch (err) {
								console.error("moveTask failed", err);
								reject(err);
							}
						});
					});
				}),
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
				onCreate={persistCreate}
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
				onSave={(updated) => {
					const prev = tasks.find((t) => t.id === updated.id);
					if (prev) persistUpdate(prev, updated);
				}}
				onDelete={persistDelete}
				tagSuggestions={tagSuggestions}
				users={users}
			/>
		</div>
	);
}
