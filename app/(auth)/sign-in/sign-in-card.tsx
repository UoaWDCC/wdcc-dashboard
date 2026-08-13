"use client";

import { useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth-errors";
import { signIn } from "@/lib/auth-client";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function SignInCard({
  callbackURL,
  errorCode,
}: {
  callbackURL: string;
  errorCode: string | null;
}) {
  const [pending, setPending] = useState(false);
  // Errors from the OAuth callback arrive in the URL; errors from the request
  // that starts sign-in (offline, server down, rate limited) arrive here.
  const [clientError, setClientError] = useState<string | null>(null);
  const message = clientError ?? authErrorMessage(errorCode);

  async function handleSignIn() {
    setPending(true);
    setClientError(null);
    try {
      const res = await signIn.social({
        provider: "google",
        callbackURL,
        // Carry the destination through a failed attempt so the retry still
        // lands where the user was headed.
        errorCallbackURL:
          callbackURL === "/"
            ? "/sign-in"
            : `/sign-in?from=${encodeURIComponent(callbackURL)}`,
      });
      if (res.error) {
        setClientError(
          authErrorMessage(res.error.code) ??
            res.error.message ??
            "We couldn't reach Google sign-in. Check your connection and try again."
        );
        setPending(false);
      }
      // On success the client redirects to Google, so leave the button pending.
    } catch (err) {
      console.error("[sign-in] failed to start Google sign-in", err);
      setClientError(
        "We couldn't reach the server. Check your connection and try again."
      );
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_-10%,color-mix(in_srgb,var(--brand-blue)_16%,transparent),transparent),radial-gradient(40rem_30rem_at_100%_110%,color-mix(in_srgb,var(--brand-purple)_12%,transparent),transparent)]"
      />

      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-card p-8 shadow-xl shadow-foreground/5 ring-1 ring-foreground/10">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-blue text-lg font-semibold tracking-tight text-brand-blue-fg">
              W
            </div>
            <h1 className="mt-5 font-heading text-xl font-semibold">
              WDCC Dashboard
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Sign in with your Google account to continue.
            </p>
          </div>

          {message && (
            <div
              role="alert"
              className="text-destructive mt-6 flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3 text-left text-sm"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <Button
            variant="outline"
            className="mt-6 h-11 w-full gap-2.5 text-sm"
            onClick={handleSignIn}
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <GoogleMark className="size-4" />
            )}
            {pending ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
        </div>

        <p className="text-muted-foreground mt-5 text-center text-xs">
          Access is limited to WDCC execs on the dashboard list.
        </p>
      </div>
    </main>
  );
}
