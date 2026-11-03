"use client";

import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { PlusIcon, StickyNoteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FLAG_BADGE,
  FLAG_LABEL,
  MONTH_LABEL,
  type CheckInCell,
  type CheckInPerson,
} from "@/lib/check-ins/types";
import { CHECK_IN_FLAGS, type CheckInFlag } from "@/lib/types";
import { cn } from "@/lib/utils";

type CellPatch = {
  checked?: boolean;
  flag?: CheckInFlag | null;
  note?: string | null;
};

export function CheckInCellView({
  person,
  year,
  cell,
  onPatch,
}: {
  person: CheckInPerson;
  year: number;
  cell: CheckInCell;
  onPatch: (patch: CellPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const month = MONTH_LABEL[cell.month];
  const savedNote = cell.note ?? "";
  const nextNote = draft.trim();

  function saveNote() {
    onPatch({ note: nextNote || null });
    setOpen(false);
  }

  return (
    <div
      className={cn(
        "group flex h-8 items-center gap-1 rounded-md px-1.5",
        cell.checked && "bg-emerald-500/10"
      )}
    >
      <input
        type="checkbox"
        checked={cell.checked}
        onChange={(e) => onPatch({ checked: e.target.checked })}
        aria-label={`Checked in with ${person.name} in ${month}`}
        className="accent-brand-blue size-4 shrink-0 cursor-pointer"
      />
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (next) setDraft(savedNote);
          setOpen(next);
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            title={cell.note ?? undefined}
            aria-label={`Flag or note for ${person.name} in ${month}`}
            className="hover:bg-accent flex h-6 min-w-6 items-center justify-center gap-1 rounded px-1"
          >
            {cell.flag && (
              <span
                className={cn(
                  "rounded-full border px-1.5 text-[11px] leading-4 font-medium whitespace-nowrap",
                  FLAG_BADGE[cell.flag]
                )}
              >
                {FLAG_LABEL[cell.flag]}
              </span>
            )}
            {cell.note && (
              <StickyNoteIcon className="text-muted-foreground size-3.5" />
            )}
            {!cell.flag && !cell.note && (
              <PlusIcon className="text-muted-foreground size-3.5 opacity-30 group-hover:opacity-100" />
            )}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="bg-popover text-popover-foreground z-50 w-72 space-y-3 rounded-md border p-3 shadow-md outline-none"
          >
            <div className="text-sm font-medium">
              {person.name}{" "}
              <span className="text-muted-foreground font-normal">
                · {month} {year}
              </span>
            </div>
            <div className="flex gap-1">
              <FlagButton
                active={cell.flag === null}
                onClick={() => onPatch({ flag: null })}
              >
                None
              </FlagButton>
              {CHECK_IN_FLAGS.map((f) => (
                <FlagButton
                  key={f}
                  active={cell.flag === f}
                  activeClass={FLAG_BADGE[f]}
                  onClick={() => onPatch({ flag: f })}
                >
                  {FLAG_LABEL[f]}
                </FlagButton>
              ))}
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote();
              }}
              placeholder="Note for this month"
              aria-label="Note"
              maxLength={2000}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={nextNote === savedNote}
                onClick={saveNote}
              >
                Save note
              </Button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}

function FlagButton({
  active,
  activeClass,
  onClick,
  children,
}: {
  active: boolean;
  activeClass?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        active
          ? (activeClass ?? "bg-muted text-foreground border-transparent")
          : "text-muted-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}
