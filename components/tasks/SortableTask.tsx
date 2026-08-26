"use client";

import { useDraggable } from "@dnd-kit/core";
import type { BoardUser, ClientTask } from "@/lib/tasks/types";
import { sortableId } from "@/lib/tasks/utils";
import { TaskCard } from "./TaskCard";

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
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: sortableId(columnId, task.id),
    data: { type: "task", columnId, taskId: task.id },
  });

  return (
    <div
      ref={setNodeRef}
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
