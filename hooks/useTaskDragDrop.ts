"use client";

import { useMemo, useState } from "react";
import {
	DragEndEvent,
	DragStartEvent,
	PointerSensor,
	closestCenter,
	pointerWithin,
	rectIntersection,
	type CollisionDetection,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import type { ClientTask } from "@/lib/tasks/types";
import {
	applyDragLocal,
	neighborsOf,
} from "@/lib/tasks/utils";

export type PersistMoveInput = {
	taskId: string;
	fromCol: string;
	toCol: string;
	beforeId: string | null;
	afterId: string | null;
};

export function useTaskDragDrop({
	tasks,
	setTasks,
	persistMove,
}: {
	tasks: ClientTask[];
	setTasks: React.Dispatch<React.SetStateAction<ClientTask[]>>;
	persistMove: (input: PersistMoveInput) => Promise<void>;
}) {
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

	const activeTask = useMemo(
		() =>
			activeTaskId
				? (tasks.find((t) => t.id === activeTaskId) ?? null)
				: null,
		[activeTaskId, tasks],
	);

	function handleDragStart(e: DragStartEvent) {
		const data = e.active.data.current as
			| { type: "task"; taskId: string }
			| undefined;
		if (data?.taskId) setActiveTaskId(data.taskId);
	}

	function handleDragCancel() {
		setActiveTaskId(null);
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
		const next = applyDragLocal(
			tasks,
			aData.taskId,
			aData.columnId,
			toCol,
			overTaskId,
		);
		setTasks(next);

		const { beforeId, afterId } = neighborsOf(next, aData.taskId, toCol);

		persistMove({
			taskId: aData.taskId,
			fromCol: aData.columnId,
			toCol,
			beforeId,
			afterId,
		}).catch(() => {
			setTasks(snapshot);
		});
	}

	return {
		sensors,
		collisionDetection,
		activeTask,
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
	};
}
