"use client";

import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Searchable multi-select. Empty `selected` means "no filter", so a cleared
// list and an all-selected list are deliberately the same thing to callers.
// Values are opaque strings; `label` is what gets searched and shown, which is
// what lets the same control filter teams, tags or people.
export function FilterSelect<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  const trigger =
    selected.length === 0
      ? label
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} of ${options.length}`;

  function toggle(value: T) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  }

  return (
    <PopoverPrimitive.Root onOpenChange={() => setQuery("")}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="w-36 justify-between font-normal"
        >
          <span
            className={cn(
              "truncate",
              selected.length ? undefined : "text-muted-foreground"
            )}
          >
            {trigger}
          </span>
          <ChevronDownIcon className="size-4 opacity-50" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="bg-popover text-popover-foreground z-50 w-56 rounded-md border p-1 shadow-md outline-none"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            aria-label={`Search ${label.toLowerCase()}`}
            className="placeholder:text-muted-foreground w-full border-b bg-transparent px-2 py-1.5 text-sm outline-none"
          />
          <div className="max-h-56 overflow-auto py-1">
            {matches.map((o) => (
              <label
                key={o.value}
                className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="accent-brand-blue size-3.5"
                />
                {o.label}
              </label>
            ))}
            {matches.length === 0 && (
              <p className="text-muted-foreground px-2 py-1 text-xs">
                No match
              </p>
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-1 rounded-sm border-t px-2 py-1.5 text-xs"
            >
              <XIcon className="size-3" />
              Clear
            </button>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
