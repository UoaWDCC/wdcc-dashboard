"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { GoogleMark } from "@/assets/google-mark";
import { Button } from "@/components/ui/button";
import { AUTH_ERROR_FALLBACK, authErrorMessage } from "@/lib/auth-errors";
import { signIn } from "@/lib/auth-client";

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
  const message =
    clientError ??
    (errorCode ? (authErrorMessage(errorCode) ?? AUTH_ERROR_FALLBACK) : null);

  // Coming back from Google's consent screen restores this page from the
  // bfcache with `pending` still set, leaving the button stuck disabled.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setPending(false);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
          // Our own copy first, then whatever Better Auth said, then a guess at
          // the most likely cause of a request that failed without saying why.
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
