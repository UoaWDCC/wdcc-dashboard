import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_ERROR_CODES } from "@/lib/auth-errors";
import { auth } from "@/lib/auth";
import { isAllowed } from "@/lib/profile";

type ActiveSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

type ResolvedSession =
  | { session: ActiveSession }
  | { session: null; reason: "none" | "revoked" | "error" };

// Memoized per request: the dashboard layout and every server action call
// `requireUser()`, and each uncached call costs two serial round trips to the
// database (session lookup, then allowlist check). `cache()` collapses them
// into one without weakening the gate — the allowlist is still re-checked on
// every request, and a revoked profile still signs the user out.
const resolveSession = cache(async (): Promise<ResolvedSession> => {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return { session: null, reason: "none" };
  let allowed: boolean;
  try {
    allowed = await isAllowed(session.user.email);
  } catch (err) {
    console.error("[rbac] profile lookup failed; failing closed", err);
    return { session: null, reason: "error" };
  }
  if (!allowed) {
    try {
      await auth.api.signOut({ headers: hdrs });
    } catch (err) {
      console.error("[rbac] signOut after profile revoke failed", err);
    }
    return { session: null, reason: "revoked" };
  }
  return { session };
});

export async function requireUser(from?: string) {
  const resolved = await resolveSession();
  if (!resolved.session) {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (resolved.reason === "revoked") {
      params.set("error", AUTH_ERROR_CODES.ACCESS_REVOKED);
    } else if (resolved.reason === "error") {
      params.set("error", AUTH_ERROR_CODES.SERVER_ERROR);
    }
    const query = params.toString();
    redirect(query ? `/sign-in?${query}` : "/sign-in");
  }
  return resolved.session;
}
