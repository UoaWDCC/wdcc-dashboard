"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { signIn } from "@/lib/auth-client";
import { AUTH_ERROR_CODES } from "@/lib/auth-errors";
import { safePath } from "@/lib/utils";

export function GoogleSignInButton({ from }: { from?: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  // The success path leaves `pending` true on purpose while the browser
  // navigates to Google. Coming back via the Back button restores this page
  // from the bfcache with React state intact, which would otherwise leave the
  // button disabled and spinning with no way to retry.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const target = safePath(from) ?? "/";
  const params = new URLSearchParams();
  if (from) {
    params.set("from", target);
  }
  const query = params.toString();
  const errorCallbackURL = query ? `/sign-in?${query}` : "/sign-in";

  // The client resolves with `{ data, error }` rather than throwing, so a
  // rejected request (403 INVALID_ORIGIN, 5xx, ...) would otherwise leave the
  // button stuck on "Redirecting to Google…" forever. Surface it through the
  // same `?error=` panel the server-side failures use.
  async function onClick() {
    setPending(true);
    try {
      const { error } = await signIn.social({
        provider: "google",
        callbackURL: target,
        errorCallbackURL,
      });
      if (!error) return; // keeps pending=true because of useEffect above
    } catch (err) {
      // network-level failure
      console.error("[auth] sign-in request failed", err);
    }
    setPending(false);
    params.set("error", AUTH_ERROR_CODES.SERVER_ERROR);
    router.replace(`/sign-in?${params}`);
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="h-11 w-full gap-2.5 rounded-xl text-sm font-medium"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <GoogleIcon className="size-4" />
      )}
      {pending ? "Redirecting to Google…" : "Continue with Google"}
    </Button>
  );
}
