"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortState<T> = {
  key: string;
  getValue: (row: T) => string | number;
  direction: 1 | -1;
};

export function useSortableRows<T>(rows: T[]) {
  const [sort, setSort] = useState<SortState<T> | null>(null);

  function head(
    label: ReactNode,
    key: string,
    getValue: (row: T) => string | number,
    className?: string
  ) {
    const direction = sort?.key === key ? sort.direction : null;
    return (
      <TableHead
        className={cn("cursor-pointer select-none", className)}
        onClick={() =>
          setSort((prev) =>
            prev?.key === key
              ? prev.direction === 1
                ? { key, getValue, direction: -1 }
                : null
              : { key, getValue, direction: 1 }
          )
        }
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {direction === 1 ? (
            <ArrowUp className="size-3" />
          ) : direction === -1 ? (
            <ArrowDown className="size-3" />
          ) : (
            <ArrowUpDown className="size-3 opacity-30" />
          )}
        </span>
      </TableHead>
    );
  }

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const { getValue, direction } = sort;
    return [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * direction;
      }
      return String(av).localeCompare(String(bv)) * direction;
    });
  }, [rows, sort]);

  return { head, sortedRows };
}
