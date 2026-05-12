"use client";

import { useEffect, useMemo, useState } from "react";
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	closestCorners,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link2, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Priority = "low" | "med" | "high";
type Team = "Admin" | "Projects" | "Tech" | "Marketing" | "Industry" | "Social";
type Status = "backlog" | "active" | "done";

type Task = {
	id: string;
	title: string;
	description?: string;
	tags?: string[];
	links?: string[];
	priority?: Priority;
	team?: Team;
	status: Status;
	assignees: string[];
	positions: Record<string, number>;
};

const PRIORITIES: Priority[] = ["low", "med", "high"];
const TEAMS: Team[] = [
	"Admin",
	"Projects",
	"Tech",
	"Marketing",
	"Industry",
	"Social",
];
const priorityDot: Record<Priority, string> = {
	low: "bg-emerald-500",
	med: "bg-amber-500",
	high: "bg-red-500",
};
const priorityLabel: Record<Priority, string> = {
	low: "Low priority",
	med: "Medium priority",
	high: "High priority",
};

type ColumnMeta = {
	id: string;
	label: string;
	accent: "neutral" | "blue" | "orange" | "green";
};

const members = ["Alex", "Bea", "Chen", "Dani", "Evan"];
const memberCol = (m: string) => `member-${m}`;
const memberFromCol = (colId: string) =>
	colId.startsWith("member-") ? colId.slice("member-".length) : null;

const initialTasks: Task[] = [
	{ id: "t1", title: "Design auth flow", tags: ["design"], status: "backlog", assignees: [], positions: { backlog: 0 } },
	{ id: "t2", title: "Set up CI", tags: ["infra"], status: "backlog", assignees: [], positions: { backlog: 1 } },
	{ id: "t3", title: "Write onboarding doc", tags: ["docs"], status: "backlog", assignees: [], positions: { backlog: 2 } },
	{ id: "t4", title: "Sprint planning notes", status: "backlog", assignees: [], positions: { backlog: 3 } },
	{ id: "a1", title: "Kanban layout", tags: ["frontend"], status: "active", assignees: ["Alex"], positions: { "member-Alex": 0 } },
	{ id: "a2", title: "Sidebar polish", tags: ["frontend"], status: "active", assignees: ["Alex"], positions: { "member-Alex": 1 } },
	{ id: "b1", title: "RBAC review", tags: ["backend"], status: "active", assignees: ["Bea"], positions: { "member-Bea": 0 } },
	{ id: "c1", title: "DB migrations", tags: ["db"], status: "active", assignees: ["Chen"], positions: { "member-Chen": 0 } },
	{ id: "c2", title: "Schema cleanup", tags: ["db"], status: "active", assignees: ["Chen"], positions: { "member-Chen": 1 } },
	{ id: "d1", title: "Marketing page copy", tags: ["content"], status: "active", assignees: ["Dani"], positions: { "member-Dani": 0 } },
	{ id: "x1", title: "Repo bootstrap", status: "done", assignees: [], positions: { done: 0 } },
	{ id: "x2", title: "Login w/ Google", tags: ["auth"], status: "done", assignees: [], positions: { done: 1 } },
];

const backlogMeta: ColumnMeta = { id: "backlog", label: "Backlog", accent: "blue" };
const doneMeta: ColumnMeta = { id: "done", label: "Done", accent: "green" };
const memberMeta: ColumnMeta[] = members.map((m) => ({
	id: memberCol(m),
	label: m,
	accent: "neutral",
}));

const accentMap = {
	neutral: {
		wrap: "bg-foreground/8 ring-foreground/20",
		header: "border-foreground/15",
		title: "",
		count: "text-muted-foreground",
	},
	blue: {
		wrap: "bg-brand-pink/10 ring-brand-pink/50",
		header: "border-brand-pink/30",
		title: "text-brand-pink",
		count: "bg-brand-pink text-white rounded-md px-1.5 py-0.5",
	},
	orange: {
		wrap: "bg-brand-orange/10 ring-brand-orange/50",
		header: "border-brand-orange/30",
		title: "text-brand-orange",
		count: "bg-brand-orange text-white rounded-md px-1.5 py-0.5",
	},
	green: {
		wrap: "bg-brand-green/10 ring-brand-green/50",
		header: "border-brand-green/30",
		title: "text-brand-green",
		count: "bg-brand-green text-white rounded-md px-1.5 py-0.5",
	},
} as const;

function belongsTo(task: Task, colId: string): boolean {
	if (colId === "backlog") return task.status === "backlog";
	if (colId === "done") return task.status === "done";
	const m = memberFromCol(colId);
	if (m) return task.status === "active" && task.assignees.includes(m);
	return false;
}

function colTasks(tasks: Task[], colId: string): Task[] {
	return tasks
		.filter((t) => belongsTo(t, colId))
		.sort(
			(a, b) =>
				(a.positions[colId] ?? Infinity) - (b.positions[colId] ?? Infinity)
		);
}

const sortableId = (colId: string, taskId: string) => `${colId}::${taskId}`;
const parseSortableId = (id: string): { colId: string; taskId: string } => {
	const idx = id.indexOf("::");
	return { colId: id.slice(0, idx), taskId: id.slice(idx + 2) };
};

function TaskCard({
	task,
	columnId,
	dragging = false,
}: {
	task: Task;
	columnId?: string;
	dragging?: boolean;
}) {
	const colMember = columnId ? memberFromCol(columnId) : null;
	const shownAssignees = colMember
		? task.assignees.filter((a) => a !== colMember)
		: task.assignees;

	return (
		<Card
			size="sm"
			className={cn(
				"group relative cursor-grab select-none shadow-sm ring-foreground/15 active:cursor-grabbing",
				dragging && "opacity-50"
			)}
		>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 pr-6">
					{task.priority && (
						<span
							aria-label={priorityLabel[task.priority]}
							title={priorityLabel[task.priority]}
							className={cn(
								"inline-block size-2 shrink-0 rounded-full",
								priorityDot[task.priority]
							)}
						/>
					)}
					<span className="min-w-0 truncate">{task.title}</span>
				</CardTitle>
			</CardHeader>
			{(task.description ||
				task.tags?.length ||
				task.team ||
				task.links?.length ||
				shownAssignees.length > 0) && (
				<CardContent className="flex flex-col gap-2">
					{task.description && (
						<p className="text-muted-foreground text-xs">{task.description}</p>
					)}
					{(task.tags?.length ||
						task.team ||
						task.links?.length ||
						shownAssignees.length > 0) && (
						<div className="flex flex-wrap items-center gap-1">
							{task.team && (
								<Badge variant="outline" className="text-[10px]">
									{task.team}
								</Badge>
							)}
							{task.tags?.map((t) => (
								<Badge key={t} variant="secondary" className="text-[10px]">
									{t}
								</Badge>
							))}
							{shownAssignees.map((a) => (
								<Badge
									key={`assignee-${a}`}
									className="bg-brand-blue/15 text-brand-blue text-[10px]"
								>
									+{a}
								</Badge>
							))}
							{task.links?.length ? (
								<span
									title={`${task.links.length} link${task.links.length === 1 ? "" : "s"}`}
									className="text-muted-foreground inline-flex items-center gap-0.5 text-[10px]"
								>
									<Link2 className="size-3" />
									{task.links.length}
								</span>
							) : null}
						</div>
					)}
				</CardContent>
			)}
		</Card>
	);
}

function SortableTask({
	task,
	columnId,
	onEdit,
}: {
	task: Task;
	columnId: string;
	onEdit: (task: Task) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({
			id: sortableId(columnId, task.id),
			data: { type: "task", columnId, taskId: task.id },
		});

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			{...attributes}
			{...listeners}
			onClick={() => {
				if (isDragging) return;
				onEdit(task);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onEdit(task);
				}
			}}
		>
			<TaskCard task={task} columnId={columnId} dragging={isDragging} />
		</div>
	);
}

function TaskColumn({
	meta,
	tasks,
	className,
	onEditTask,
}: {
	meta: ColumnMeta;
	tasks: Task[];
	className?: string;
	onEditTask: (task: Task) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: meta.id,
		data: { type: "column", columnId: meta.id },
	});
	const styles = accentMap[meta.accent];
	const taskIds = useMemo(
		() => tasks.map((t) => sortableId(meta.id, t.id)),
		[tasks, meta.id]
	);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"flex min-w-0 flex-col rounded-lg ring-1 transition-colors",
				styles.wrap,
				isOver && "ring-2 ring-brand-blue/60",
				className
			)}
		>
			<div
				className={cn(
					"flex items-center justify-between px-3 py-2.5 border-b",
					styles.header
				)}
			>
				<h2
					className={cn("text-sm font-semibold tracking-tight", styles.title)}
				>
					{meta.label}
				</h2>
				<span className={cn("text-xs tabular-nums", styles.count)}>
					{tasks.length}
				</span>
			</div>
			<SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
				<div className="flex flex-col gap-2 p-2 min-h-24">
					{tasks.map((t) => (
						<SortableTask
							key={sortableId(meta.id, t.id)}
							task={t}
							columnId={meta.id}
							onEdit={onEditTask}
						/>
					))}
				</div>
			</SortableContext>
		</div>
	);
}

function TagInput({
	id,
	tags,
	onChange,
	suggestions = [],
}: {
	id?: string;
	tags: string[];
	onChange: (tags: string[]) => void;
	suggestions?: string[];
}) {
	const [draft, setDraft] = useState("");
	const [highlight, setHighlight] = useState(0);
	const [open, setOpen] = useState(false);

	const matches = useMemo(() => {
		const q = draft.trim().toLowerCase();
		const selected = new Set(tags);
		const pool = suggestions.filter((s) => !selected.has(s));
		if (!q) return pool.slice(0, 8);
		return pool.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
	}, [draft, tags, suggestions]);

	useEffect(() => {
		setHighlight(0);
	}, [draft, matches.length]);

	function commit(raw: string) {
		const v = raw.trim();
		if (!v) return;
		if (tags.includes(v)) {
			setDraft("");
			return;
		}
		onChange([...tags, v]);
		setDraft("");
	}

	function removeAt(idx: number) {
		onChange(tags.filter((_, i) => i !== idx));
	}

	return (
		<div className="relative">
			<div className="border-input focus-within:ring-ring/40 flex flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1.5 text-sm focus-within:ring-2">
				{tags.map((t, i) => (
					<Badge key={`${t}-${i}`} variant="secondary" className="gap-1 pr-1">
						{t}
						<button
							type="button"
							aria-label={`Remove ${t}`}
							onClick={() => removeAt(i)}
							className="hover:bg-foreground/15 rounded-sm p-0.5"
						>
							<X className="size-3" />
						</button>
					</Badge>
				))}
				<input
					id={id}
					value={draft}
					onFocus={() => setOpen(true)}
					onBlur={() => {
						setTimeout(() => setOpen(false), 100);
						commit(draft);
					}}
					onChange={(e) => {
						setDraft(e.target.value);
						setOpen(true);
					}}
					onKeyDown={(e) => {
						if (e.key === "ArrowDown" && matches.length) {
							e.preventDefault();
							setOpen(true);
							setHighlight((h) => (h + 1) % matches.length);
						} else if (e.key === "ArrowUp" && matches.length) {
							e.preventDefault();
							setOpen(true);
							setHighlight((h) => (h - 1 + matches.length) % matches.length);
						} else if (e.key === "Enter") {
							e.preventDefault();
							if (open && matches[highlight]) commit(matches[highlight]);
							else commit(draft);
						} else if (e.key === ",") {
							e.preventDefault();
							commit(draft);
						} else if (e.key === "Escape") {
							setOpen(false);
						} else if (e.key === "Backspace" && !draft && tags.length) {
							e.preventDefault();
							removeAt(tags.length - 1);
						}
					}}
					placeholder={tags.length ? "" : "Type and press Enter"}
					className="placeholder:text-muted-foreground min-w-[8ch] flex-1 bg-transparent outline-none"
				/>
			</div>
			{open && matches.length > 0 && (
				<ul className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border p-1 shadow-md">
					{matches.map((s, i) => (
						<li key={s}>
							<button
								type="button"
								onMouseDown={(e) => {
									e.preventDefault();
									commit(s);
								}}
								onMouseEnter={() => setHighlight(i)}
								className={cn(
									"w-full rounded-sm px-2 py-1 text-left text-sm",
									i === highlight && "bg-accent text-accent-foreground"
								)}
							>
								{s}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function TaskEditDialog({
	task,
	open,
	onOpenChange,
	onSave,
	onDelete,
	tagSuggestions,
}: {
	task: Task | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (task: Task) => void;
	onDelete: (id: string) => void;
	tagSuggestions: string[];
}) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [links, setLinks] = useState<string[]>([]);
	const [linkDraft, setLinkDraft] = useState("");
	const [priority, setPriority] = useState<Priority | "">("");
	const [team, setTeam] = useState<Team | "">("");
	const [assignees, setAssignees] = useState<string[]>([]);

	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description ?? "");
			setTags(task.tags ?? []);
			setLinks(task.links ?? []);
			setLinkDraft("");
			setPriority(task.priority ?? "");
			setTeam(task.team ?? "");
			setAssignees(task.assignees ?? []);
		}
	}, [task]);

	function addLink() {
		const v = linkDraft.trim();
		if (!v) return;
		if (links.includes(v)) {
			setLinkDraft("");
			return;
		}
		setLinks([...links, v]);
		setLinkDraft("");
	}

	function toggleAssignee(name: string) {
		setAssignees((cur) =>
			cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]
		);
	}

	function handleSave() {
		if (!task) return;
		const trimmed = title.trim();
		if (!trimmed) return;
		const pendingLink = linkDraft.trim();
		const finalLinks =
			pendingLink && !links.includes(pendingLink) ? [...links, pendingLink] : links;
		onSave({
			...task,
			title: trimmed,
			description: description.trim() || undefined,
			tags: tags.length ? tags : undefined,
			links: finalLinks.length ? finalLinks : undefined,
			priority: priority || undefined,
			team: team || undefined,
			assignees,
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
									{PRIORITIES.map((p) => (
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
							{members.map((m) => {
								const active = assignees.includes(m);
								return (
									<button
										key={m}
										type="button"
										disabled={assigneesDisabled}
										onClick={() => toggleAssignee(m)}
										className={cn(
											"rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-50",
											active
												? "bg-brand-blue text-brand-blue-fg border-transparent"
												: "border-input hover:bg-accent"
										)}
									>
										{m}
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
										key={`${l}-${i}`}
										className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 text-xs"
									>
										<a
											href={l}
											target="_blank"
											rel="noreferrer"
											className="text-brand-blue min-w-0 flex-1 truncate hover:underline"
										>
											{l}
										</a>
										<button
											type="button"
											aria-label={`Remove ${l}`}
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

function applyDrag(
	tasks: Task[],
	taskId: string,
	fromCol: string,
	toCol: string,
	overTaskId: string | null
): Task[] {
	const task = tasks.find((t) => t.id === taskId);
	if (!task) return tasks;

	let status = task.status;
	let assignees = [...task.assignees];
	const oldMember = memberFromCol(fromCol);
	const newMember = memberFromCol(toCol);

	if (toCol === "backlog") {
		if (oldMember) {
			assignees = assignees.filter((m) => m !== oldMember);
			if (assignees.length === 0) status = "backlog";
		} else {
			status = "backlog";
			assignees = [];
		}
	} else if (toCol === "done") {
		status = "done";
	} else if (newMember) {
		status = "active";
		if (oldMember && oldMember !== newMember) {
			assignees = assignees.filter((m) => m !== oldMember);
		}
		if (!assignees.includes(newMember)) assignees.push(newMember);
	}

	const mutated = tasks.map((t) =>
		t.id === taskId ? { ...t, status, assignees } : t
	);
	const movedTask = mutated.find((t) => t.id === taskId)!;
	const taskBelongsToDest = belongsTo(movedTask, toCol);

	const destOrdered = mutated
		.filter((t) => t.id !== taskId && belongsTo(t, toCol))
		.sort(
			(a, b) =>
				(a.positions[toCol] ?? Infinity) - (b.positions[toCol] ?? Infinity)
		);
	let insertIdx = destOrdered.length;
	if (overTaskId && overTaskId !== taskId) {
		const idx = destOrdered.findIndex((t) => t.id === overTaskId);
		if (idx >= 0) insertIdx = idx;
	}
	if (taskBelongsToDest) destOrdered.splice(insertIdx, 0, movedTask);

	const destPositions = new Map<string, number>();
	destOrdered.forEach((t, i) => destPositions.set(t.id, i));

	const sourcePositions = new Map<string, number>();
	if (fromCol !== toCol) {
		const sourceOrdered = mutated
			.filter((t) => t.id !== taskId && belongsTo(t, fromCol))
			.sort(
				(a, b) =>
					(a.positions[fromCol] ?? Infinity) -
					(b.positions[fromCol] ?? Infinity)
			);
		sourceOrdered.forEach((t, i) => sourcePositions.set(t.id, i));
	}

	return mutated.map((t) => {
		if (t.id === taskId) {
			const positions: Record<string, number> = {};
			for (const [colId, pos] of Object.entries(t.positions)) {
				if (colId !== toCol && colId !== fromCol && belongsTo(t, colId)) {
					positions[colId] = pos;
				}
			}
			if (taskBelongsToDest) {
				positions[toCol] = destPositions.get(t.id) ?? 0;
			}
			return { ...t, positions };
		}
		const destPos = destPositions.get(t.id);
		const srcPos = sourcePositions.get(t.id);
		if (destPos === undefined && srcPos === undefined) return t;
		const positions = { ...t.positions };
		if (destPos !== undefined) positions[toCol] = destPos;
		if (srcPos !== undefined) positions[fromCol] = srcPos;
		return { ...t, positions };
	});
}

export default function TasksPage() {
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const tagSuggestions = useMemo(() => {
		const set = new Set<string>();
		for (const t of tasks) for (const tag of t.tags ?? []) set.add(tag);
		return Array.from(set).sort();
	}, [tasks]);

	function openEdit(task: Task) {
		setEditingTaskId(task.id);
		setDialogOpen(true);
	}

	function updateTask(updated: Task) {
		setTasks((prev) => {
			const old = prev.find((t) => t.id === updated.id);
			let next = updated;
			if (
				old &&
				old.status === "backlog" &&
				updated.status === "backlog" &&
				updated.assignees.length > 0
			) {
				const positions: Record<string, number> = {};
				for (const m of updated.assignees) {
					const colId = memberCol(m);
					positions[colId] = prev.filter((t) =>
						t.id !== updated.id && belongsTo(t, colId)
					).length;
				}
				next = { ...updated, status: "active", positions };
			}
			return prev.map((t) => (t.id === updated.id ? next : t));
		});
	}

	function deleteTask(id: string) {
		setTasks((prev) => prev.filter((t) => t.id !== id));
	}

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
	);

	const editingTask = useMemo(
		() => tasks.find((t) => t.id === editingTaskId) ?? null,
		[tasks, editingTaskId]
	);

	const activeTask = useMemo(
		() => (activeTaskId ? tasks.find((t) => t.id === activeTaskId) ?? null : null),
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

		setTasks((prev) =>
			applyDrag(prev, aData.taskId, aData.columnId, toCol, overTaskId)
		);
	}

	const backlogTasks = useMemo(() => colTasks(tasks, "backlog"), [tasks]);
	const doneTasksList = useMemo(() => colTasks(tasks, "done"), [tasks]);
	const memberTasksByCol = useMemo(() => {
		const m: Record<string, Task[]> = {};
		for (const meta of memberMeta) m[meta.id] = colTasks(tasks, meta.id);
		return m;
	}, [tasks]);

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex items-baseline justify-between">
				<h1 className="text-2xl font-semibold">Tasks</h1>
				<p className="text-muted-foreground text-xs">
					{tasks.length} tasks · {members.length} members
				</p>
			</div>
			<DndContext
				id="tasks"
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={() => setActiveTaskId(null)}
			>
				<div className="flex flex-1 min-h-0 gap-3">
					<TaskColumn
						meta={backlogMeta}
						tasks={backlogTasks}
						className="w-64 shrink-0"
						onEditTask={openEdit}
					/>
					<section className="flex min-w-0 flex-1 flex-col rounded-lg ring-1 ring-brand-blue/50 bg-brand-blue/10">
						<div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-blue/30">
							<h2 className="text-sm font-semibold tracking-tight text-brand-blue">
								Ongoing Tasks
							</h2>
							<span className="bg-brand-blue text-white text-xs tabular-nums rounded-md px-1.5 py-0.5">
								{members.length}
							</span>
						</div>
						<div className="flex-1 overflow-y-auto p-2">
							<div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
								{memberMeta.map((m) => (
									<TaskColumn
										key={m.id}
										meta={m}
										tasks={memberTasksByCol[m.id] ?? []}
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
						onEditTask={openEdit}
					/>
				</div>
				<DragOverlay>
					{activeTask ? <TaskCard task={activeTask} /> : null}
				</DragOverlay>
			</DndContext>
			<TaskEditDialog
				task={editingTask}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={updateTask}
				onDelete={deleteTask}
				tagSuggestions={tagSuggestions}
			/>
		</div>
	);
}
