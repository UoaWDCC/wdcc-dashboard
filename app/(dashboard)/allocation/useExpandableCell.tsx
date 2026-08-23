"use client";

import { useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Expanded = { title: string; content: ReactNode };

export function textPopup(value: string): ReactNode {
  return <p className="whitespace-pre-wrap">{value || "—"}</p>;
}

export function useExpandableCell() {
  const [expanded, setExpanded] = useState<Expanded | null>(null);

  function cell(
    value: string,
    options?: { title?: string; content?: ReactNode; className?: string }
  ) {
    const content = options?.content;
    return (
      <TableCell>
        <div
          className={cn(
            "max-w-40 truncate",
            content && "cursor-pointer",
            options?.className
          )}
          onClick={
            content
              ? () => setExpanded({ title: options?.title ?? value, content })
              : undefined
          }
        >
          {value || "—"}
        </div>
      </TableCell>
    );
  }

  const dialog = (
    <Dialog
      open={expanded !== null}
      onOpenChange={(open) => !open && setExpanded(null)}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{expanded?.title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto text-sm">
          {expanded?.content}
        </div>
      </DialogContent>
    </Dialog>
  );

  return { cell, dialog };
}
