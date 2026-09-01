"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import GoLinkDialog from "@/components/linktree/GoLinkDialog";
import GoLinksList from "@/components/linktree/GoLinksList";
import { Button } from "@/components/ui/button";
import type { AddGoLinkInput, GoLinkRow } from "@/lib/linktree/types";
import {
  addGoLinkAction,
  removeGoLinkAction,
  reorderGoLinksAction,
  toggleGoLinkHiddenAction,
  updateGoLinkAction,
} from "@/server/linktree/actions";

export default function GoLinksManager({
  initialLinks,
  today,
}: {
  initialLinks: GoLinkRow[];
  // Passed from the server so client grouping matches the server's ordering.
  today: string;
}) {
  const [, startTransition] = useTransition();
  const [links, setLinks] = useState<GoLinkRow[]>(initialLinks);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  const editingLink = useMemo(
    () => links.find((l) => l.id === editingLinkId) ?? null,
    [links, editingLinkId]
  );

  function handleReorder(next: GoLinkRow[]) {
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
    setLinks((cur) => cur.map((l) => (l.id === id ? { ...l, hidden } : l)));
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
        // The server assigns the new row the next available sortOrder, so it
        // should appear at the end. Mirror that locally by appending the row.
        setLinks((cur) => [...cur, row]);
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
        <GoLinksList
          links={links}
          today={today}
          onReorder={handleReorder}
          onRemove={handleRemove}
          onToggleHidden={handleToggleHidden}
          onEdit={openEdit}
        />
      )}

      <GoLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <GoLinkDialog
        link={editingLink}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={(input) => {
          if (editingLinkId) handleUpdate(editingLinkId, input);
        }}
      />
    </section>
  );
}
