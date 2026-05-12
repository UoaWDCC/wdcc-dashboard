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
import { Pencil, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Task = {
	id: string;
	title: string;
	description?: string;
	tags?: string[];
};

type ColumnMeta = {
	id: string;
	label: string;
	accent: "neutral" | "blue" | "blue-strong";
};

const members = ["Alex", "Bea", "Chen", "Dani", "Evan"];

const initialState: Record<string, Task[]> = {
	backlog: [
		{ id: "t1", title: "Design auth flow", tags: ["design"] },
		{ id: "t2", title: "Set up CI", tags: ["infra"] },
		{ id: "t3", title: "Write onboarding doc", tags: ["docs"] },
		{ id: "t4", title: "Sprint planning notes" },
	],
	"member-Alex": [
		{ id: "a1", title: "Kanban layout", tags: ["frontend"] },
		{ id: "a2", title: "Sidebar polish", tags: ["frontend"] },
	],
	"member-Bea": [{ id: "b1", title: "RBAC review", tags: ["backend"] }],
	"member-Chen": [
		{ id: "c1", title: "DB migrations", tags: ["db"] },
		{ id: "c2", title: "Schema cleanup", tags: ["db"] },
	],
	"member-Dani": [{ id: "d1", title: "Marketing page copy", tags: ["content"] }],
	"member-Evan": [],
	done: [
		{ id: "x1", title: "Repo bootstrap" },
		{ id: "x2", title: "Login w/ Google", tags: ["auth"] },
	],
};

const backlogMeta: ColumnMeta = {
	id: "backlog",
	label: "Backlog",
	accent: "blue",
};
const doneMeta: ColumnMeta = {
	id: "done",
	label: "Done",
	accent: "blue-strong",
};
const memberMeta: ColumnMeta[] = members.map((m) => ({
	id: `member-${m}`,
	label: m,
	accent: "neutral",
}));

const accentMap = {
	neutral: {
		wrap: "bg-muted ring-foreground/15",
		header: "border-foreground/10",
		title: "",
		count: "text-muted-foreground",
	},
	blue: {
		wrap: "bg-brand-blue/5 ring-brand-blue/25",
		header: "border-brand-blue/20",
		title: "text-brand-blue",
		count: "bg-brand-blue/15 text-brand-blue rounded-md px-1.5 py-0.5",
	},
	"blue-strong": {
		wrap: "bg-brand-blue/10 ring-brand-blue/40",
		header: "border-brand-blue/30",
		title: "text-brand-blue",
		count: "bg-brand-blue text-brand-blue-fg rounded-md px-1.5 py-0.5",
	},
} as const;

function TaskCard({
	task,
	dragging = false,
	onEdit,
}: {
	task: Task;
	dragging?: boolean;
	onEdit?: () => void;
}) {
	return (
		<Card
			size="sm"
			className={cn(
				"group relative cursor-grab select-none active:cursor-grabbing",
				dragging && "opacity-50"
			)}
		>
			<CardHeader>
				<CardTitle className="pr-6">{task.title}</CardTitle>
			</CardHeader>
			{(task.description || task.tags?.length) && (
				<CardContent className="flex flex-col gap-2">
					{task.description && (
						<p className="text-muted-foreground text-xs">{task.description}</p>
					)}
					{task.tags?.length ? (
						<div className="flex flex-wrap gap-1">
							{task.tags.map((t) => (
								<Badge key={t} variant="secondary" className="text-[10px]">
									{t}
								</Badge>
							))}
						</div>
					) : null}
				</CardContent>
			)}
			{onEdit && (
				<button
					type="button"
					aria-label="Edit task"
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
					className="absolute right-1.5 top-1.5 rounded p-1 text-muted-foreground opacity-0 transition hover:bg-foreground/10 hover:text-foreground group-hover:opacity-100 focus:opacity-100 focus:outline-none"
				>
					<Pencil className="size-3.5" />
				</button>
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
		useSortable({ id: task.id, data: { type: "task", columnId } });

	return (
		<div
			ref={setNodeRef}
			style={{
				transform: CSS.Transform.toString(transform),
				transition,
			}}
			{...attributes}
			{...listeners}
		>
			<TaskCard task={task} dragging={isDragging} onEdit={() => onEdit(task)} />
		</div>
	);
}

function KanbanColumn({
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
	const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

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
							key={t.id}
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

	useEffect(() => {
		if (task) {
			setTitle(task.title);
			setDescription(task.description ?? "");
			setTags(task.tags ?? []);
		}
	}, [task]);

	function handleSave() {
		if (!task) return;
		const trimmed = title.trim();
		if (!trimmed) return;
		onSave({
			id: task.id,
			title: trimmed,
			description: description.trim() || undefined,
			tags: tags.length ? tags : undefined,
		});
		onOpenChange(false);
	}

	function handleDelete() {
		if (!task) return;
		onDelete(task.id);
		onOpenChange(false);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit task</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-3">
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
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
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

export default function KanbanPage() {
	const [columns, setColumns] = useState<Record<string, Task[]>>(initialState);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [editing, setEditing] = useState<{ colId: string; task: Task } | null>(
		null
	);
	const [dialogOpen, setDialogOpen] = useState(false);

	const tagSuggestions = useMemo(() => {
		const set = new Set<string>();
		for (const list of Object.values(columns)) {
			for (const t of list) for (const tag of t.tags ?? []) set.add(tag);
		}
		return Array.from(set).sort();
	}, [columns]);

	function openEdit(task: Task) {
		const colId = findColumn(task.id);
		if (!colId) return;
		setEditing({ colId, task });
		setDialogOpen(true);
	}

	function updateTask(updated: Task) {
		if (!editing) return;
		const colId = editing.colId;
		setColumns((prev) => ({
			...prev,
			[colId]: prev[colId].map((t) => (t.id === updated.id ? updated : t)),
		}));
	}

	function deleteTask(id: string) {
		if (!editing) return;
		const colId = editing.colId;
		setColumns((prev) => ({
			...prev,
			[colId]: prev[colId].filter((t) => t.id !== id),
		}));
	}

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
	);

	const findColumn = (id: string): string | null => {
		if (id in columns) return id;
		for (const colId of Object.keys(columns)) {
			if (columns[colId].some((t) => t.id === id)) return colId;
		}
		return null;
	};

	const activeTask: Task | null = useMemo(() => {
		if (!activeId) return null;
		for (const list of Object.values(columns)) {
			const t = list.find((x) => x.id === activeId);
			if (t) return t;
		}
		return null;
	}, [activeId, columns]);

	function handleDragStart(e: DragStartEvent) {
		setActiveId(String(e.active.id));
	}

	function handleDragEnd(e: DragEndEvent) {
		const { active, over } = e;
		setActiveId(null);
		if (!over) return;

		const activeIdStr = String(active.id);
		const overIdStr = String(over.id);
		const fromCol = findColumn(activeIdStr);
		const toCol = findColumn(overIdStr);
		if (!fromCol || !toCol) return;

		setColumns((prev) => {
			const next = { ...prev };
			const fromList = [...next[fromCol]];
			const fromIdx = fromList.findIndex((t) => t.id === activeIdStr);
			if (fromIdx < 0) return prev;
			const [moved] = fromList.splice(fromIdx, 1);

			if (fromCol === toCol) {
				// reorder within column
				const overIdx =
					overIdStr === toCol
						? fromList.length
						: fromList.findIndex((t) => t.id === overIdStr);
				const insertAt = overIdx < 0 ? fromList.length : overIdx;
				fromList.splice(insertAt, 0, moved);
				next[fromCol] = fromList;
			} else {
				const toList = [...next[toCol]];
				const overIdx =
					overIdStr === toCol
						? toList.length
						: toList.findIndex((t) => t.id === overIdStr);
				const insertAt = overIdx < 0 ? toList.length : overIdx;
				toList.splice(insertAt, 0, moved);
				next[fromCol] = fromList;
				next[toCol] = toList;
			}
			return next;
		});
	}

	const totalTasks = Object.values(columns).reduce((n, l) => n + l.length, 0);

	return (
		<div className="flex h-full flex-col gap-4">
			<div className="flex items-baseline justify-between">
				<h1 className="text-2xl font-semibold">Kanban</h1>
				<p className="text-muted-foreground text-xs">
					{totalTasks} tasks · {members.length} members
				</p>
			</div>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={() => setActiveId(null)}
			>
				<div className="flex flex-1 min-h-0 gap-3">
					<KanbanColumn
						meta={backlogMeta}
						tasks={columns[backlogMeta.id]}
						className="w-64 shrink-0"
						onEditTask={openEdit}
					/>
					<section className="flex min-w-0 flex-1 flex-col rounded-lg ring-1 ring-brand-blue/15 bg-brand-blue/[0.03]">
						<div className="flex items-center justify-between px-3 py-2.5 border-b border-brand-blue/15">
							<h2 className="text-sm font-semibold tracking-tight text-brand-blue">
								Ongoing Tasks
							</h2>
							<span className="text-muted-foreground text-xs tabular-nums">
								{members.length}
							</span>
						</div>
						<div className="flex-1 overflow-y-auto p-2">
							<div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
								{memberMeta.map((m) => (
									<KanbanColumn
										key={m.id}
										meta={m}
										tasks={columns[m.id] ?? []}
										onEditTask={openEdit}
									/>
								))}
							</div>
						</div>
					</section>
					<KanbanColumn
						meta={doneMeta}
						tasks={columns[doneMeta.id]}
						className="w-64 shrink-0"
						onEditTask={openEdit}
					/>
				</div>
				<DragOverlay>
					{activeTask ? <TaskCard task={activeTask} /> : null}
				</DragOverlay>
			</DndContext>
			<TaskEditDialog
				task={editing?.task ?? null}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSave={updateTask}
				onDelete={deleteTask}
				tagSuggestions={tagSuggestions}
			/>
		</div>
	);
}
