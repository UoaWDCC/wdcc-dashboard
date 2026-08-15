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

async function resolveSession(): Promise<ResolvedSession> {
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
}

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
