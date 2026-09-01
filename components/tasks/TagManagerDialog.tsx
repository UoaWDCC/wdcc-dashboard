"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteTagAction, updateTagAction } from "@/server/tags/actions";
import { toast } from "sonner";
import type { TagView } from "@/lib/tags/types";

export function TagManagerDialog({
  open,
  onOpenChange,
  tags,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tags: TagView[];
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, { name: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, { name: string }> = {};
    for (const t of tags) next[t.id] = { name: t.name };
    // Seed drafts from server tags when dialog opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(next);
    setEditingId(null);
  }, [open, tags]);

  function setName(id: string, value: string) {
    setDrafts((d) => ({ ...d, [id]: { name: value } }));
  }

  function startEdit(t: TagView) {
    setDrafts((d) => ({ ...d, [t.id]: { name: t.name } }));
    setEditingId(t.id);
  }

  function cancelEdit(t: TagView) {
    setDrafts((d) => ({ ...d, [t.id]: { name: t.name } }));
    setEditingId(null);
  }

  function save(t: TagView) {
    const d = drafts[t.id];
    if (!d) return;
    const name = d.name.trim().toLowerCase();
    if (!name || name === t.name) {
      setEditingId(null);
      return;
    }
    const patch = { name };
    startTransition(async () => {
      try {
        await updateTagAction(t.id, patch);
        setEditingId(null);
        onChanged();
        toast.success("Tag updated");
      } catch (e) {
        console.error("updateTagAction failed", e);
        toast.error("Failed to update tag");
      }
    });
  }

  function remove(t: TagView) {
    if (!confirm(`Delete tag "${t.name}"? It will be removed from all tasks.`))
      return;
    startTransition(async () => {
      try {
        await deleteTagAction(t.id);
        onChanged();
        toast.success("Tag deleted");
      } catch (e) {
        console.error("deleteTagAction failed", e);
        toast.error("Failed to delete tag");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {tags.length === 0 && (
            <p className="text-muted-foreground text-sm">No tags yet.</p>
          )}
          {tags.map((t) => {
            const d = drafts[t.id] ?? { name: t.name };
            const editing = editingId === t.id;
            const dirty = d.name.trim().toLowerCase() !== t.name;
            return (
              <div key={t.id} className="flex items-center gap-2">
                {editing ? (
                  <Input
                    value={d.name}
                    onChange={(e) => setName(t.id, e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 px-3 py-2 text-sm">{t.name}</span>
                )}
                {editing ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!dirty || pending}
                      onClick={() => save(t)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => cancelEdit(t)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending || editingId !== null}
                    onClick={() => startEdit(t)}
                    aria-label={`Edit ${t.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(t)}
                  aria-label={`Delete ${t.name}`}
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
