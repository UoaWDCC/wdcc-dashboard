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
import type { ClientMoveTask, ClientTask } from "@/lib/tasks/types";

// activeTaskId is owned by the caller: the board poll pauses while dragging,
// and that gate has to be reactive one level up.
export function useTaskDragDrop({
  tasks,
  onMove,
  activeTaskId,
  setActiveTaskId,
}: {
  tasks: ClientTask[];
  onMove: (input: ClientMoveTask) => void;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
}) {
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

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

  const activeTask = useMemo(
    () =>
      activeTaskId ? (tasks.find((t) => t.id === activeTaskId) ?? null) : null,
    [activeTaskId, tasks]
  );

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as
      | { type: "task"; columnId: string; taskId: string }
      | undefined;
    if (data?.taskId) setActiveTaskId(data.taskId);
    setActiveColumnId(data?.columnId ?? null);
    setActiveWidth(e.active.rect.current.initial?.width ?? null);
  }

  function handleDragCancel() {
    setActiveTaskId(null);
    setActiveWidth(null);
    setActiveColumnId(null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveTaskId(null);
    setActiveWidth(null);
    setActiveColumnId(null);
    if (!over) return;

    const aData = active.data.current as
      | { type: "task"; columnId: string; taskId: string }
      | undefined;
    if (!aData) return;

    // Cards are draggables only, so the drop target is always a column.
    const oData = over.data.current as
      | { type: "column"; columnId: string }
      | undefined;

    const toCol = oData?.columnId ?? String(over.id);

    onMove({
      taskId: aData.taskId,
      fromCol: aData.columnId,
      toCol,
    });
  }

  return {
    sensors,
    collisionDetection,
    activeTask,
    activeWidth,
    activeColumnId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
}
