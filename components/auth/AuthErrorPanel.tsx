import { AlertCircle } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export function AuthErrorPanel({
  code,
  description,
}: {
  code: string;
  description?: string;
}) {
  const message = getAuthErrorMessage(code, description);

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 px-3.5 py-3 text-left"
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
        {message.code ? (
          <p className="pt-0.5 font-mono text-xs break-all text-muted-foreground/80">
            {message.code}
          </p>
        ) : null}
      </div>
    </div>
  );
}
