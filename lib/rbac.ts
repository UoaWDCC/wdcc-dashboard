import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAllowedEmail } from "@/lib/allowlist";

export async function getSession() {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return null;
  let allowed: boolean;
  try {
    allowed = await isAllowedEmail(session.user.email);
  } catch (err) {
    console.error("[rbac] allowlist lookup failed; failing closed", err);
    return null;
  }
  if (!allowed) {
    try {
      await auth.api.signOut({ headers: hdrs });
    } catch (err) {
      console.error("[rbac] signOut after allowlist revoke failed", err);
    }
    return null;
  }
  return session;
}

export async function requireUser(from?: string) {
  const session = await getSession();
  if (!session) {
    const target = from ? `/sign-in?from=${encodeURIComponent(from)}` : "/sign-in";
    redirect(target);
  }
  return session;
}
