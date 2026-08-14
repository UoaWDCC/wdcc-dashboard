import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AUTH_ERROR } from "@/lib/auth-errors";
import { isAllowed } from "@/lib/profile";

type ActiveSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

type SessionResult =
  | { session: ActiveSession; error: null }
  | { session: null; error: string | null };

/**
 * Resolves the session and, when there isn't a usable one, why — so the
 * sign-in page can explain itself instead of silently reappearing.
 *
 * Memoized per request: the dashboard layout and its page render in parallel
 * and both resolve the session, which would otherwise be two `getSession`
 * calls and two allowlist queries on the critical path.
 */
export const resolveSession = cache(async (): Promise<SessionResult> => {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return { session: null, error: null };
  let allowed: boolean;
  try {
    allowed = await isAllowed(session.user.email);
  } catch (err) {
    console.error("[rbac] profile lookup failed; failing closed", err);
    return { session: null, error: AUTH_ERROR.allowlistLookupFailed };
  }
  if (!allowed) {
    // Deleting the session row is what revokes access; the browser cookie is
    // left stale on purpose. This runs during a Server Component render, where
    // Next forbids cookie writes and `nextCookies()` swallows the attempt (see
    // `lib/auth.ts`) — and the cookie grants nothing anyway, since every
    // request comes back through this allowlist check.
    try {
      await auth.api.signOut({ headers: hdrs });
    } catch (err) {
      // Belt and braces. Better Auth swallows both known failure modes itself —
      // the row delete (logged internally, then it still returns success) and
      // the cookie write — so only a transport-level surprise reaches here.
      console.error("[rbac] sign-out of revoked session threw", err);
    }
    return { session: null, error: AUTH_ERROR.accessRevoked };
  }
  return { session, error: null };
});

export async function requireUser(from?: string) {
  const { session, error } = await resolveSession();
  if (!session) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (error) params.set("error", error);
    const query = params.toString();
    redirect(query ? `/sign-in?${query}` : "/sign-in");
  }
  return session;
}
