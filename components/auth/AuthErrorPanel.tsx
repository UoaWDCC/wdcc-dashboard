"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export function AuthErrorPanel({ code }: { code: string }) {
  const message = getAuthErrorMessage(code);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [code]);

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
    >
      <AlertCircle
        className="mt-0.5 size-4 shrink-0 text-destructive"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm leading-snug font-medium text-destructive">
          {message.title}
        </p>
        <p className="text-sm leading-snug text-muted-foreground">
          {message.description}
        </p>
      </div>
    </div>
  );
}
