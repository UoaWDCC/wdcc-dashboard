"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import { sortableId } from "@/lib/tasks/utils";
import { TaskCard } from "./task-card";

export function SortableTask({
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
