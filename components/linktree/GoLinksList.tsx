"use client";

import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import GoLinkRow, { GRID_COLS } from "@/components/linktree/GoLinkRow";
import { cn } from "@/lib/utils";
import { isLinkExpired } from "@/lib/date";
import type { GoLinkRow as GoLink } from "@/lib/linktree/types";

type GroupKey = "active" | "permanent" | "expired";

const GROUP_ORDER: readonly GroupKey[] = ["active", "permanent", "expired"];

const GROUP_LABEL: Record<GroupKey, string> = {
  active: "Active",
  permanent: "Permanent",
  expired: "Expired",
};

function groupOf(link: GoLink, today: string): GroupKey {
  if (isLinkExpired(link.eventDate, today)) return "expired";
  if (link.isPermanent) return "permanent";
  return "active";
}

export default function GoLinksList({
  links,
  today,
  onReorder,
  onRemove,
  onToggleHidden,
  onEdit,
}: {
  links: GoLink[];
  // Passed from the server so client grouping matches the server's ordering.
  today: string;
  onReorder: (next: GoLink[]) => void;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  onEdit: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const out: Record<GroupKey, GoLink[]> = {
      active: [],
      permanent: [],
      expired: [],
    };
    for (const l of links) out[groupOf(l, today)].push(l);
    return out;
  }, [links, today]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragEnd(group: GroupKey, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const groupLinks = groups[group];
    const oldIdx = groupLinks.findIndex((l) => l.id === active.id);
    const newIdx = groupLinks.findIndex((l) => l.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const reordered = arrayMove(groupLinks, oldIdx, newIdx);
    onReorder([
      ...(group === "active" ? reordered : groups.active),
      ...(group === "permanent" ? reordered : groups.permanent),
      ...(group === "expired" ? reordered : groups.expired),
    ]);
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "hidden md:grid items-center gap-3 px-2 pb-1 text-xs font-medium text-muted-foreground border-b",
          GRID_COLS
        )}
      >
        <span />
        <span>Label</span>
        <span>Link</span>
        <span>Team</span>
        <span>Expiry Date</span>
        <span>Flags</span>
        <span className="text-right">Actions</span>
      </div>

      {GROUP_ORDER.map((g) =>
        groups[g].length === 0 ? null : (
          <div key={g} className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {GROUP_LABEL[g]}
            </h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(g, e)}
            >
              <SortableContext
                items={groups[g].map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1">
                  {groups[g].map((link) => (
                    <GoLinkRow
                      key={link.id}
                      link={link}
                      expired={g === "expired"}
                      onRemove={onRemove}
                      onToggleHidden={onToggleHidden}
                      onEdit={onEdit}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        )
      )}
    </div>
  );
}
