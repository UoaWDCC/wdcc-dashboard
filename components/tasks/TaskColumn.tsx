"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { BoardUser, ClientTask, ColumnMeta } from "@/lib/tasks/types";
import { sortableId } from "@/lib/tasks/utils";
import { SortableTask } from "./SortableTask";

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

export function TaskColumn({
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
