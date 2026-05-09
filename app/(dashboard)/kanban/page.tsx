"use client";

import { useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
}: {
	task: Task;
	dragging?: boolean;
}) {
	return (
		<Card
			size="sm"
			className={cn(
				"cursor-grab select-none active:cursor-grabbing",
				dragging && "opacity-50"
			)}
		>
			<CardHeader>
				<CardTitle>{task.title}</CardTitle>
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
		</Card>
	);
}

function SortableTask({ task, columnId }: { task: Task; columnId: string }) {
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
			<TaskCard task={task} dragging={isDragging} />
		</div>
	);
}

function KanbanColumn({
	meta,
	tasks,
	className,
}: {
	meta: ColumnMeta;
	tasks: Task[];
	className?: string;
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
						<SortableTask key={t.id} task={t} columnId={meta.id} />
					))}
				</div>
			</SortableContext>
		</div>
	);
}

export default function KanbanPage() {
	const [columns, setColumns] = useState<Record<string, Task[]>>(initialState);
	const [activeId, setActiveId] = useState<string | null>(null);

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
									/>
								))}
							</div>
						</div>
					</section>
					<KanbanColumn
						meta={doneMeta}
						tasks={columns[doneMeta.id]}
						className="w-64 shrink-0"
					/>
				</div>
				<DragOverlay>
					{activeTask ? <TaskCard task={activeTask} /> : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}
