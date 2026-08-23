"use client";

import { useId } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function FileField({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName: string | null;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <label htmlFor={inputId} className="cursor-pointer">
            <Upload /> Choose file
          </label>
        </Button>
        <span className="truncate text-sm text-muted-foreground">
          {fileName ?? "No file chosen"}
        </span>
      </div>
      <input
        id={inputId}
        type="file"
        accept=".csv"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
