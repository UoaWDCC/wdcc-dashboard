"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	closestCenter,
	pointerWithin,
	rectIntersection,
	type CollisionDetection,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
	createTask,
	deleteTag,
	moveTask,
	softDeleteTask,
	updateTag,
	updateTask,
	type ColumnId,
	type TaskView,
} from "@/server/tasks/actions";
import {
	TASK_PRIORITIES,
	TEAMS,
	PRIORITY_DOT,
	PRIORITY_LABEL,
	type TaskPriority as Priority,
	type Team,
} from "@/lib/types";
import type {
	BoardUser,
	TagOption,
	ClientAssignee,
	ClientTask,
	ColumnMeta,
} from "@/lib/tasks/types";
import {
	userColId,
	userFromCol,
	colIdToColumnId,
	fromServer,
	belongsTo,
	colTasks,
	positionFor,
	neighborsOf,
	applyDragLocal,
} from "@/lib/tasks/utils";
import { TaskCard } from "@/components/tasks/TaskCard";
import { SortableTask } from "@/components/tasks/SortableTask";
import { TagInput } from "@/components/tasks/TagInput";
import { TaskColumn } from "@/components/tasks/TaskColumn";
import { TagManagerDialog } from "@/components/tasks/TagManagerDialog";

function TaskEditDialog({
	task,
	open,
	onOpenChange,
	onSave,
	onDelete,
	tagSuggestions,
	users,
}: {
	task: ClientTask | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (task: ClientTask) => void;
	onDelete: (id: string) => void;
	tagSuggestions: string[];
	users: BoardUser[];
}) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [links, setLinks] = useState<{ id?: string; url: string; title: string | null }[]>(
		[]
	);
	const [linkDraft, setLinkDraft] = useState("");
	const [priority, setPriority] = useState<Priority | "">("");
	const [team, setTeam] = useState<Team | "">("");
	const [assigneeEmails, setAssigneeEmails] = useState<string[]>([]);

	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description ?? "");
			setTags(task.tags);
			setLinks(task.links);
			setLinkDraft("");
			setPriority(task.priority ?? "");
			setTeam(task.team ?? "");
			setAssigneeEmails(task.assignees.map((a) => a.profileEmail));
		}
	}, [task]);

	function addLink() {
		const v = linkDraft.trim();
		if (!v) return;
		if (links.some((l) => l.url === v)) {
			setLinkDraft("");
			return;
		}
		setLinks([...links, { url: v, title: null }]);
		setLinkDraft("");
	}

	function toggleAssignee(email: string) {
		setAssigneeEmails((cur) =>
			cur.includes(email) ? cur.filter((u) => u !== email) : [...cur, email]
		);
	}

	function handleSave() {
		if (!task) return;
		const trimmed = title.trim();
		if (!trimmed) return;
		const pendingLink = linkDraft.trim();
		const finalLinks =
			pendingLink && !links.some((l) => l.url === pendingLink)
				? [...links, { url: pendingLink, title: null }]
				: links;
		onSave({
			...task,
			title: trimmed,
			description: description.trim() || null,
			tags,
			links: finalLinks,
			priority: priority || null,
			team: team || null,
			assignees: assigneeEmails.map((email, i) => ({
				profileEmail: email,
				position:
					task.assignees.find((a) => a.profileEmail === email)?.position ??
					i + 1,
			})),
		});
		onOpenChange(false);
	}

	function handleDelete() {
		if (!task) return;
		onDelete(task.id);
		onOpenChange(false);
	}

	const assigneesDisabled = task?.status === "done";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit task</DialogTitle>
				</DialogHeader>
				<div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-title">Title</Label>
						<Input
							id="task-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-desc">Description</Label>
						<Textarea
							id="task-desc"
							rows={8}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-priority">Priority</Label>
							<Select
								value={priority || undefined}
								onValueChange={(v) => setPriority(v as Priority)}
							>
								<SelectTrigger id="task-priority">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									{TASK_PRIORITIES.map((p) => (
										<SelectItem key={p} value={p}>
											{p}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="task-team">Team</Label>
							<Select
								value={team || undefined}
								onValueChange={(v) => setTeam(v as Team)}
							>
								<SelectTrigger id="task-team">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									{TEAMS.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>
							Assignees
							{assigneesDisabled && (
								<span className="text-muted-foreground ml-2 text-xs font-normal">
									(not available for done tasks)
								</span>
							)}
						</Label>
						<div className="flex flex-wrap gap-1.5">
							{users.map((m) => {
								const active = assigneeEmails.includes(m.email);
								return (
									<button
										key={m.email}
										type="button"
										disabled={assigneesDisabled}
										onClick={() => toggleAssignee(m.email)}
										className={cn(
											"rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
											active
												? "bg-brand-blue text-brand-blue-fg border-transparent"
												: "border-input hover:bg-accent"
										)}
									>
										{m.name}
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-tags">Tags</Label>
						<TagInput
							id="task-tags"
							tags={tags}
							onChange={setTags}
							suggestions={tagSuggestions}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="task-link">Links</Label>
						<div className="flex gap-2">
							<Input
								id="task-link"
								type="url"
								placeholder="https://..."
								value={linkDraft}
								onChange={(e) => setLinkDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addLink();
									}
								}}
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={addLink}
								aria-label="Add link"
							>
								<Plus className="size-4" />
							</Button>
						</div>
						{links.length > 0 && (
							<ul className="flex flex-col gap-1">
								{links.map((l, i) => (
									<li
										key={`${l.url}-${i}`}
										className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs"
									>
										<a
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-brand-blue min-w-0 flex-1 truncate hover:underline"
										>
											{l.url}
										</a>
										<button
											type="button"
											aria-label={`Remove ${l.url}`}
											onClick={() =>
												setLinks(links.filter((_, idx) => idx !== i))
											}
											className="hover:bg-foreground/10 rounded p-0.5"
										>
											<X className="size-3" />
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
				<DialogFooter className="sm:justify-between">
					<Button variant="destructive" onClick={handleDelete}>
						Delete
					</Button>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={!title.trim()}>
							Save
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function TaskCreateDialog({
	open,
	onOpenChange,
	onCreate,
	tagSuggestions,
	users,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreate: (input: {
		title: string;
		description: string | null;
		priority: Priority | null;
		team: Team | null;
		tags: string[];
		links: { url: string; title: string | null }[];
		assigneeEmails: string[];
	}) => void;
	tagSuggestions: string[];
	users: BoardUser[];
}) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [links, setLinks] = useState<{ url: string; title: string | null }[]>(
		[]
	);
	const [linkDraft, setLinkDraft] = useState("");
	const [priority, setPriority] = useState<Priority | "">("");
	const [team, setTeam] = useState<Team | "">("");
	const [assigneeEmails, setAssigneeEmails] = useState<string[]>([]);

	useEffect(() => {
		if (open) {
			setTitle("");
			setDescription("");
			setTags([]);
			setLinks([]);
			setLinkDraft("");
			setPriority("");
			setTeam("");
			setAssigneeEmails([]);
		}
	}, [open]);

	function addLink() {
		const v = linkDraft.trim();
		if (!v) return;
		if (links.some((l) => l.url === v)) {
			setLinkDraft("");
			return;
		}
		setLinks([...links, { url: v, title: null }]);
		setLinkDraft("");
	}

	function toggleAssignee(email: string) {
		setAssigneeEmails((cur) =>
			cur.includes(email) ? cur.filter((u) => u !== email) : [...cur, email]
		);
	}

	function handleCreate() {
		const trimmed = title.trim();
		if (!trimmed) return;
		const pendingLink = linkDraft.trim();
		const finalLinks =
			pendingLink && !links.some((l) => l.url === pendingLink)
				? [...links, { url: pendingLink, title: null }]
				: links;
		onCreate({
			title: trimmed,
			description: description.trim() || null,
			priority: priority || null,
			team: team || null,
			tags,
			links: finalLinks,
			assigneeEmails,
		});
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>New task</DialogTitle>
				</DialogHeader>
				<div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="new-task-title">Title</Label>
						<Input
							id="new-task-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							autoFocus
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="new-task-desc">Description</Label>
						<Textarea
							id="new-task-desc"
							rows={8}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="new-task-priority">Priority</Label>
							<Select
								value={priority || undefined}
								onValueChange={(v) => setPriority(v as Priority)}
							>
								<SelectTrigger id="new-task-priority">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									{TASK_PRIORITIES.map((p) => (
										<SelectItem key={p} value={p}>
											{p}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="new-task-team">Team</Label>
							<Select
								value={team || undefined}
								onValueChange={(v) => setTeam(v as Team)}
							>
								<SelectTrigger id="new-task-team">
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									{TEAMS.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label>Assignees</Label>
						<div className="flex flex-wrap gap-1.5">
							{users.map((m) => {
								const active = assigneeEmails.includes(m.email);
								return (
									<button
										key={m.email}
										type="button"
										onClick={() => toggleAssignee(m.email)}
										className={cn(
											"rounded-full border px-3 py-1 text-xs transition",
											active
												? "bg-brand-blue text-brand-blue-fg border-transparent"
												: "border-input hover:bg-accent"
										)}
									>
										{m.name}
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="new-task-tags">Tags</Label>
						<TagInput
							id="new-task-tags"
							tags={tags}
							onChange={setTags}
							suggestions={tagSuggestions}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="new-task-link">Links</Label>
						<div className="flex gap-2">
							<Input
								id="new-task-link"
								type="url"
								placeholder="https://..."
								value={linkDraft}
								onChange={(e) => setLinkDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addLink();
									}
								}}
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={addLink}
								aria-label="Add link"
							>
								<Plus className="size-4" />
							</Button>
						</div>
						{links.length > 0 && (
							<ul className="flex flex-col gap-1">
								{links.map((l, i) => (
									<li
										key={`${l.url}-${i}`}
										className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs"
									>
										<a
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-brand-blue min-w-0 flex-1 truncate hover:underline"
										>
											{l.url}
										</a>
										<button
											type="button"
											aria-label={`Remove ${l.url}`}
											onClick={() =>
												setLinks(links.filter((_, idx) => idx !== i))
											}
											className="hover:bg-foreground/10 rounded p-0.5"
										>
											<X className="size-3" />
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={!title.trim()}>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

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
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
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

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
	);

	// Pointer-first collision: column under the cursor wins. Falls back to
	// rectIntersection (then closestCenter) when the pointer isn't inside any
	// droppable, e.g. when auto-scrolling past column edges.
	const collisionDetection: CollisionDetection = (args) => {
		const pointer = pointerWithin(args);
		if (pointer.length > 0) return pointer;
		const intersecting = rectIntersection(args);
		if (intersecting.length > 0) return intersecting;
		return closestCenter(args);
	};

	const editingTask = useMemo(
		() => tasks.find((t) => t.id === editingTaskId) ?? null,
		[tasks, editingTaskId]
	);

	const activeTask = useMemo(
		() =>
			activeTaskId ? (tasks.find((t) => t.id === activeTaskId) ?? null) : null,
		[activeTaskId, tasks]
	);

	function handleDragStart(e: DragStartEvent) {
		const data = e.active.data.current as
			| { type: "task"; taskId: string }
			| undefined;
		if (data?.taskId) setActiveTaskId(data.taskId);
	}

	function handleDragEnd(e: DragEndEvent) {
		const { active, over } = e;
		setActiveTaskId(null);
		if (!over) return;

		const aData = active.data.current as
			| { type: "task"; columnId: string; taskId: string }
			| undefined;
		if (!aData) return;

		const oData = over.data.current as
			| { type: "task"; columnId: string; taskId: string }
			| { type: "column"; columnId: string }
			| undefined;

		const toCol =
			oData?.type === "task"
				? oData.columnId
				: oData?.type === "column"
					? oData.columnId
					: String(over.id);

		const overTaskId = oData?.type === "task" ? oData.taskId : null;

		const snapshot = tasks;
		const next = applyDragLocal(tasks, aData.taskId, aData.columnId, toCol, overTaskId);
		setTasks(next);

		const { beforeId, afterId } = neighborsOf(next, aData.taskId, toCol);

		startTransition(() => {
			trackMutation(async () => {
				try {
					await moveTask({
						taskId: aData.taskId,
						from: colIdToColumnId(aData.columnId),
						to: colIdToColumnId(toCol),
						beforeId,
						afterId,
					});
					// Optimistic state already matches server ordering. Skip
					// router.refresh() here — it can clobber subsequent in-flight
					// drags. The next mutation (or focus return) re-syncs.
				} catch (err) {
					console.error("moveTask failed", err);
					setTasks(snapshot);
				}
			});
		});
	}

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
				onDragCancel={() => setActiveTaskId(null)}
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
