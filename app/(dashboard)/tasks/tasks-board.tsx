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
	useDroppable,
	type CollisionDetection,
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
import {
	moveTask,
	softDeleteTask,
	updateTask,
	type ColumnId,
	type TaskView,
} from "@/server/tasks/actions";

type Priority = "low" | "med" | "high";
type Team = "Admin" | "Projects" | "Tech" | "Marketing" | "Industry" | "Social";
type Status = "backlog" | "active" | "done";

type BoardUser = { email: string; name: string; image: string | null };
type TagOption = { id: string; name: string; color: string | null };

type ClientAssignee = { profileEmail: string; position: number };

type ClientTask = {
	id: string;
	title: string;
	description: string | null;
	status: Status;
	priority: Priority | null;
	team: Team | null;
	tags: string[];
	links: { id?: string; url: string; title: string | null }[];
	assignees: ClientAssignee[];
	position: number;
	dueDate: string | null;
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

const userColId = (email: string) => `user-${email}`;
const userFromCol = (colId: string) =>
	colId.startsWith("user-") ? colId.slice("user-".length) : null;

function colIdToColumnId(colId: string): ColumnId {
	if (colId === "backlog") return { kind: "backlog" };
	if (colId === "done") return { kind: "done" };
	const profileEmail = userFromCol(colId);
	if (profileEmail) return { kind: "user", profileEmail };
	throw new Error(`Unknown column id: ${colId}`);
}

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

function fromServer(tasks: TaskView[]): ClientTask[] {
	return tasks.map((t) => ({
		id: t.id,
		title: t.title,
		description: t.description,
		status: t.status,
		priority: t.priority,
		team: t.team,
		tags: t.tags.map((tg) => tg.name),
		links: t.links.map((l) => ({ id: l.id, url: l.url, title: l.title })),
		assignees: t.assignees
			.map((a) => ({ profileEmail: a.profileEmail, position: a.position }))
			.sort((a, b) => a.position - b.position),
		position: t.position,
		dueDate: t.dueDate,
	}));
}

function belongsTo(task: ClientTask, colId: string): boolean {
	if (colId === "backlog") return task.status === "backlog";
	if (colId === "done") return task.status === "done";
	const email = userFromCol(colId);
	if (email)
		return (
			task.status === "active" &&
			task.assignees.some((a) => a.profileEmail === email)
		);
	return false;
}

function colTasks(tasks: ClientTask[], colId: string): ClientTask[] {
	const list = tasks.filter((t) => belongsTo(t, colId));
	const email = userFromCol(colId);
	if (email) {
		return list.sort((a, b) => {
			const ap = a.assignees.find((x) => x.profileEmail === email)?.position ?? 0;
			const bp = b.assignees.find((x) => x.profileEmail === email)?.position ?? 0;
			return ap - bp;
		});
	}
	return list.sort((a, b) => a.position - b.position);
}

const sortableId = (colId: string, taskId: string) => `${colId}::${taskId}`;

function TaskCard({
	task,
	columnId,
	dragging = false,
	userById,
}: {
	task: ClientTask;
	columnId?: string;
	dragging?: boolean;
	userById: Map<string, BoardUser>;
}) {
	const colEmail = columnId ? userFromCol(columnId) : null;
	const shownAssignees = colEmail
		? task.assignees.filter((a) => a.profileEmail !== colEmail)
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
				task.tags.length ||
				task.team ||
				task.links.length ||
				shownAssignees.length > 0) && (
				<CardContent className="flex flex-col gap-2">
					{task.description && (
						<p className="text-muted-foreground text-xs">{task.description}</p>
					)}
					{(task.tags.length ||
						task.team ||
						task.links.length ||
						shownAssignees.length > 0) && (
						<div className="flex flex-wrap items-center gap-1">
							{task.team && (
								<Badge variant="outline" className="text-[10px]">
									{task.team}
								</Badge>
							)}
							{task.tags.map((t) => (
								<Badge key={t} variant="secondary" className="text-[10px]">
									{t}
								</Badge>
							))}
							{shownAssignees.map((a) => (
								<Badge
									key={`assignee-${a.profileEmail}`}
									className="bg-brand-blue/15 text-brand-blue text-[10px]"
								>
									+{userById.get(a.profileEmail)?.name ?? a.profileEmail}
								</Badge>
							))}
							{task.links.length ? (
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
	userById,
	onEdit,
}: {
	task: ClientTask;
	columnId: string;
	userById: Map<string, BoardUser>;
	onEdit: (task: ClientTask) => void;
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
			<TaskCard
				task={task}
				columnId={columnId}
				dragging={isDragging}
				userById={userById}
			/>
		</div>
	);
}

function TaskColumn({
	meta,
	tasks,
	className,
	userById,
	onEditTask,
}: {
	meta: ColumnMeta;
	tasks: ClientTask[];
	className?: string;
	userById: Map<string, BoardUser>;
	onEditTask: (task: ClientTask) => void;
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
				<h2 className={cn("text-sm font-semibold tracking-tight", styles.title)}>
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
							userById={userById}
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
	suggestions,
}: {
	id?: string;
	tags: string[];
	onChange: (tags: string[]) => void;
	suggestions: string[];
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

	const draftLower = draft.trim().toLowerCase();
	const noMatch =
		draftLower.length > 0 &&
		matches.length === 0 &&
		!suggestions.includes(draftLower);

	useEffect(() => {
		setHighlight(0);
	}, [draft, matches.length]);

	function commit(raw: string) {
		const v = raw.trim().toLowerCase();
		if (!v) return;
		if (!suggestions.includes(v)) {
			setDraft("");
			return;
		}
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
						} else if (e.key === "Escape") {
							setOpen(false);
						} else if (e.key === "Backspace" && !draft && tags.length) {
							e.preventDefault();
							removeAt(tags.length - 1);
						}
					}}
					placeholder={tags.length ? "" : "Pick a tag"}
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
			{open && noMatch && (
				<div className="bg-popover text-muted-foreground absolute z-50 mt-1 w-full rounded-md border px-2 py-1 text-xs shadow-md">
					No matching tag — ask an admin to create &ldquo;{draftLower}&rdquo;.
				</div>
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

function applyDragLocal(
	tasks: ClientTask[],
	taskId: string,
	fromCol: string,
	toCol: string,
	overTaskId: string | null
): ClientTask[] {
	const t = tasks.find((x) => x.id === taskId);
	if (!t) return tasks;

	let status = t.status;
	let assignees = [...t.assignees];
	const oldEmail = userFromCol(fromCol);
	const newEmail = userFromCol(toCol);

	if (toCol === "backlog") {
		if (oldEmail) {
			assignees = assignees.filter((a) => a.profileEmail !== oldEmail);
			if (assignees.length === 0) status = "backlog";
		} else {
			status = "backlog";
			assignees = [];
		}
	} else if (toCol === "done") {
		status = "done";
	} else if (newEmail) {
		status = "active";
		if (oldEmail && oldEmail !== newEmail) {
			assignees = assignees.filter((a) => a.profileEmail !== oldEmail);
		}
		if (!assignees.some((a) => a.profileEmail === newEmail)) {
			assignees.push({ profileEmail: newEmail, position: 0 });
		}
	}

	const mutated = tasks.map((x) =>
		x.id === taskId ? { ...x, status, assignees } : x
	);
	const moved = mutated.find((x) => x.id === taskId)!;
	const taskBelongsToDest = belongsTo(moved, toCol);

	const destOrdered = mutated
		.filter((x) => x.id !== taskId && belongsTo(x, toCol))
		.sort((a, b) => positionFor(a, toCol) - positionFor(b, toCol));
	let insertIdx = destOrdered.length;
	if (overTaskId && overTaskId !== taskId) {
		const idx = destOrdered.findIndex((x) => x.id === overTaskId);
		if (idx >= 0) insertIdx = idx;
	}
	if (taskBelongsToDest) destOrdered.splice(insertIdx, 0, moved);

	return mutated.map((x) => {
		if (!belongsTo(x, toCol)) return x;
		const i = destOrdered.findIndex((y) => y.id === x.id);
		if (i < 0) return x;
		const newPos = i + 1;
		if (toCol === "backlog" || toCol === "done") {
			return { ...x, position: newPos };
		}
		const assigneeEmail = userFromCol(toCol)!;
		return {
			...x,
			assignees: x.assignees.map((a) =>
				a.profileEmail === assigneeEmail ? { ...a, position: newPos } : a
			),
		};
	});
}

function positionFor(task: ClientTask, colId: string): number {
	if (colId === "backlog" || colId === "done") return task.position;
	const m = userFromCol(colId);
	if (!m) return 0;
	return task.assignees.find((a) => a.profileEmail === m)?.position ?? 0;
}

function neighborsOf(
	tasks: ClientTask[],
	movedId: string,
	colId: string
): { beforeId: string | null; afterId: string | null } {
	const ordered = tasks
		.filter((t) => belongsTo(t, colId))
		.sort((a, b) => positionFor(a, colId) - positionFor(b, colId));
	const idx = ordered.findIndex((t) => t.id === movedId);
	if (idx < 0) return { beforeId: null, afterId: null };
	return {
		beforeId: idx > 0 ? ordered[idx - 1].id : null,
		afterId: idx < ordered.length - 1 ? ordered[idx + 1].id : null,
	};
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
			<div className="flex items-baseline justify-between">
				<h1 className="text-2xl font-semibold">Tasks</h1>
				<p className="text-muted-foreground text-xs">
					{tasks.length} tasks · {users.length} users
				</p>
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
