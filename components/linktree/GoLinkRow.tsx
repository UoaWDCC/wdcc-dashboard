"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GoLinkRow as GoLink } from "@/lib/linktree/types";

// Grid template shared by header + rows so columns align across both.
export const GRID_COLS =
  "grid-cols-[40px_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,0.8fr)_120px_minmax(0,1fr)_200px]";

export default function GoLinkRow({
  link,
  expired,
  onRemove,
  onToggleHidden,
  onEdit,
}: {
  link: GoLink;
  expired: boolean;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  onEdit: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  // hideExpiredGoLinks runs in after(), so on the first load past an eventDate
  // the row still has hidden = false. Derive it instead of waiting for the
  // column to catch up, or the row reads as visible while the control is
  // disabled for being expired.
  const shownAsHidden = link.hidden || expired;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "grid items-center gap-3 rounded-md border bg-background px-2 py-2 text-sm",
        GRID_COLS,
        shownAsHidden && "opacity-60",
        isDragging && "z-10 relative shadow-lg ring-2 ring-brand-blue/40"
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Drag ${link.label} to reorder`}
        className="flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span
        className="truncate font-medium"
        title={link.hoverHint ?? undefined}
      >
        {link.label}
      </span>
      <a
        href={link.link}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        {link.link}
      </a>
      <span className="truncate text-muted-foreground">{link.team ?? "—"}</span>
      <span className="tabular-nums text-muted-foreground">
        {link.eventDate ?? "—"}
      </span>
      <span className="flex flex-wrap gap-1">
        {link.isPermanent && <Badge variant="secondary">Permanent</Badge>}
        {expired && <Badge variant="destructive">Expired</Badge>}
        {shownAsHidden && <Badge variant="outline">Hidden</Badge>}
      </span>
      <span className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(link.id)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={expired}
          title={expired ? "Expired links stay hidden" : undefined}
          onClick={() => onToggleHidden(link.id, !shownAsHidden)}
        >
          {expired ? "Hidden" : shownAsHidden ? "Show" : "Hide"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(link.id)}
        >
          Remove
        </Button>
      </span>
    </li>
  );
}
