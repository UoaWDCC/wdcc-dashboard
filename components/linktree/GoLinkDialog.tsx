"use client";

import { useId, useState } from "react";
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
import type { AddGoLinkInput, GoLinkRow as GoLink } from "@/lib/linktree/types";

export default function GoLinkDialog({
  link,
  open,
  onOpenChange,
  onSubmit,
}: {
  // null / omitted = create mode.
  link?: GoLink | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: AddGoLinkInput) => void;
}) {
  const editing = Boolean(link);
  // Keeping the edit form mounted across the close animation avoids an empty
  // dialog body while the dialog fades out; the create form unmounts so its
  // state resets. `key` forces fresh state when switching between links.
  const showForm = editing || open;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit go link" : "New go link"}</DialogTitle>
        </DialogHeader>
        {showForm && (
          <GoLinkForm
            key={link?.id ?? "new"}
            initial={link ?? undefined}
            submitLabel={editing ? "Save" : "Create"}
            onSubmit={(input) => {
              onSubmit(input);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoLinkForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: GoLink;
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
          <Label htmlFor={`${fieldId}-is-permanent`} className="cursor-pointer">
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
