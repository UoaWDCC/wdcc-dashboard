"use client";

import { useId, useMemo, useState, useTransition } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  addGoLinkAction,
  removeGoLinkAction,
  reorderGoLinksAction,
  toggleGoLinkHiddenAction,
  updateGoLinkAction,
} from "@/server/linktree/actions";
import type { AddGoLinkInput, GoLinkRow } from "@/server/linktree/types";
import { toast } from "sonner";

type GroupKey = "active" | "permanent" | "expired";

const GROUP_ORDER: readonly GroupKey[] = ["active", "permanent", "expired"];

const GROUP_LABEL: Record<GroupKey, string> = {
  active: "Active",
  permanent: "Permanent",
  expired: "Expired",
};

// Grid template shared by header + rows so columns align across both.
const GRID_COLS =
  "grid-cols-[40px_minmax(0,1.2fr)_minmax(0,2fr)_minmax(0,0.8fr)_120px_minmax(0,1fr)_200px]";

function groupOf(link: GoLinkRow, today: string): GroupKey {
  if (link.eventDate !== null && link.eventDate < today) return "expired";
  if (link.isPermanent) return "permanent";
  return "active";
}


export default function GoLinksManager({
  initialLinks,
}: {
  initialLinks: GoLinkRow[];
}) {
  const [, startTransition] = useTransition();
  const [links, setLinks] = useState<GoLinkRow[]>(initialLinks);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const groups = useMemo(() => {
    const out: Record<GroupKey, GoLinkRow[]> = {
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

  const editingLink = useMemo(
    () => links.find((l) => l.id === editingLinkId) ?? null,
    [links, editingLinkId]
  );

  function handleDragEnd(group: GroupKey, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const groupLinks = groups[group];
    const oldIdx = groupLinks.findIndex((l) => l.id === active.id);
    const newIdx = groupLinks.findIndex((l) => l.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const reordered = arrayMove(groupLinks, oldIdx, newIdx);
    const next: GoLinkRow[] = [
      ...(group === "active" ? reordered : groups.active),
      ...(group === "permanent" ? reordered : groups.permanent),
      ...(group === "expired" ? reordered : groups.expired),
    ];
    const snapshot = links;
    setLinks(next);
    startTransition(async () => {
      try {
        await reorderGoLinksAction(next.map((l) => l.id));
      } catch (err) {
        console.error("reorderGoLinks failed", err);
        toast.error("Failed to reorder links");
        setLinks(snapshot);
      }
    });
  }

  function handleRemove(id: string) {
    const snapshot = links;
    setLinks((cur) => cur.filter((l) => l.id !== id));
    startTransition(async () => {
      try {
        await removeGoLinkAction(id);
        toast.success("Link removed");
      } catch (err) {
        console.error("removeGoLink failed", err);
        toast.error("Failed to remove link");
        setLinks(snapshot);
      }
    });
  }

  function handleToggleHidden(id: string, hidden: boolean) {
    const snapshot = links;
    setLinks((cur) =>
      cur.map((l) => (l.id === id ? { ...l, hidden } : l))
    );
    startTransition(async () => {
      try {
        await toggleGoLinkHiddenAction(id, hidden);
        toast.success(hidden ? "Link hidden" : "Link visible");
      } catch (err) {
        console.error("toggleGoLinkHidden failed", err);
        toast.error("Failed to update link visibility");
        setLinks(snapshot);
      }
    });
  }

  function handleCreate(input: AddGoLinkInput) {
    startTransition(async () => {
      try {
        const row = await addGoLinkAction(input);
        // Server bumps existing sortOrders by 1 and inserts the new row at 0.
        // Mirror that locally by prepending — group placement is recomputed
        // from the link's own fields, not its sortOrder.
        setLinks((cur) => [row, ...cur]);
        toast.success("Link added");
      } catch (err) {
        console.error("addGoLink failed", err);
        toast.error("Failed to add link");
      }
    });
  }

  function handleUpdate(id: string, input: AddGoLinkInput) {
    const snapshot = links;
    setLinks((cur) =>
      cur.map((l) =>
        l.id === id
          ? {
              ...l,
              label: input.label.trim(),
              link: input.link.trim(),
              hoverHint: input.hoverHint?.trim() || null,
              iconUrl: input.iconUrl?.trim() || null,
              team: input.team?.trim() || null,
              isPermanent: input.isPermanent ?? false,
              eventDate: input.eventDate?.trim() || null,
            }
          : l
      )
    );
    startTransition(async () => {
      try {
        await updateGoLinkAction(id, input);
        toast.success("Link updated");
      } catch (err) {
        console.error("updateGoLink failed", err);
        toast.error("Failed to update link");
        setLinks(snapshot);
      }
    });
  }

  function openEdit(id: string) {
    setEditingLinkId(id);
    setEditOpen(true);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Go links</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Add link
        </Button>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links added yet.</p>
      ) : (
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
              <Group
                key={g}
                groupKey={g}
                links={groups[g]}
                sensors={sensors}
                onDragEnd={(e) => handleDragEnd(g, e)}
                onRemove={handleRemove}
                onToggleHidden={handleToggleHidden}
                onEdit={openEdit}
              />
            )
          )}
        </div>
      )}

      <CreateLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <EditLinkDialog
        link={editingLink}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(input) => {
          if (editingLinkId) handleUpdate(editingLinkId, input);
        }}
      />
    </section>
  );
}

function Group({
  groupKey,
  links,
  sensors,
  onDragEnd,
  onRemove,
  onToggleHidden,
  onEdit,
}: {
  groupKey: GroupKey;
  links: GoLinkRow[];
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  onRemove: (id: string) => void;
  onToggleHidden: (id: string, hidden: boolean) => void;
  onEdit: (id: string) => void;
}) {
  const expired = groupKey === "expired";
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {GROUP_LABEL[groupKey]}
      </h3>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={links.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <SortableLinkRow
                key={link.id}
                link={link}
                expired={expired}
                onRemove={onRemove}
                onToggleHidden={onToggleHidden}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableLinkRow({
  link,
  expired,
  onRemove,
  onToggleHidden,
  onEdit,
}: {
  link: GoLinkRow;
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
        (link.hidden || expired) && "opacity-60",
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
      <span className="truncate font-medium" title={link.hoverHint ?? undefined}>
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
        {link.hidden && <Badge variant="outline">Hidden</Badge>}
      </span>
      <span className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(link.id)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleHidden(link.id, !link.hidden)}
        >
          {link.hidden ? "Show" : "Hide"}
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

function GoLinkForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: GoLinkRow;
  submitLabel: string;
  onSubmit: (input: AddGoLinkInput) => void;
  onCancel: () => void;
}) {
  const fieldId = useId();
  const [label, setLabel] = useState(initial?.label ?? "");
  const [linkUrl, setLinkUrl] = useState(initial?.link ?? "");
  const [team, setTeam] = useState(initial?.team ?? "");
  const [hoverHint, setHoverHint] = useState(initial?.hoverHint ?? "");
  const [iconUrl, setIconUrl] = useState(initial?.iconUrl ?? "");
  const [eventDate, setEventDate] = useState(initial?.eventDate ?? "");
  const [isPermanent, setIsPermanent] = useState(initial?.isPermanent ?? false);

  const disabled = !label.trim() || !linkUrl.trim();

  function handleSubmit() {
    if (disabled) return;
    onSubmit({
      label: label.trim(),
      link: linkUrl.trim(),
      team: team.trim() || null,
      hoverHint: hoverHint.trim() || null,
      iconUrl: iconUrl.trim() || null,
      eventDate: eventDate.trim() || null,
      isPermanent,
    });
  }

  function onKeyDownSubmit(e: React.KeyboardEvent) {
    // Cmd/Ctrl+Enter from any field submits — matches macOS/Windows form muscle memory.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <>
      <div
        className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
        onKeyDown={onKeyDownSubmit}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-label`}>Label</Label>
          <Input
            id={`${fieldId}-label`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-link`}>Link</Label>
          <Input
            id={`${fieldId}-link`}
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-team`}>Team</Label>
            <Input
              id={`${fieldId}-team`}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${fieldId}-event-date`}>Expiry Date</Label>
            <Input
              id={`${fieldId}-event-date`}
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-hover-hint`}>Hover hint</Label>
          <Input
            id={`${fieldId}-hover-hint`}
            value={hoverHint}
            onChange={(e) => setHoverHint(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${fieldId}-icon-url`}>Icon URL</Label>
          <Input
            id={`${fieldId}-icon-url`}
            type="url"
            placeholder="https://..."
            value={iconUrl}
            onChange={(e) => setIconUrl(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={`${fieldId}-is-permanent`}
            checked={isPermanent}
            onChange={(e) => setIsPermanent(e.target.checked)}
            className="size-4 cursor-pointer accent-primary"
          />
          <Label
            htmlFor={`${fieldId}-is-permanent`}
            className="cursor-pointer"
          >
            Permanent
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={disabled}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

function CreateLinkDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: AddGoLinkInput) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New go link</DialogTitle>
        </DialogHeader>
        {open && (
          <GoLinkForm
            submitLabel="Create"
            onSubmit={(input) => {
              onCreate(input);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditLinkDialog({
  link,
  open,
  onOpenChange,
  onSave,
}: {
  link: GoLinkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: AddGoLinkInput) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit go link</DialogTitle>
        </DialogHeader>
        {/* key forces fresh form state when switching between links.
            Keeping `link` set across the close animation avoids an empty
            dialog body while the dialog fades out. */}
        {link && (
          <GoLinkForm
            key={link.id}
            initial={link}
            submitLabel="Save"
            onSubmit={(input) => {
              onSave(input);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
