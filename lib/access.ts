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
 */
export async function resolveSession(): Promise<SessionResult> {
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
    try {
      await auth.api.signOut({ headers: hdrs });
    } catch (err) {
      console.error("[rbac] signOut after profile revoke failed", err);
    }
    return { session: null, error: AUTH_ERROR.accessRevoked };
  }
  return { session, error: null };
}

export async function getSession() {
  const { session } = await resolveSession();
  return session;
}

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
