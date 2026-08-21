import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(req: NextRequest) {
  const session = getSessionCookie(req);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the sign-in page, the auth handler and static assets, so
  // new routes are covered by default. This only checks that a session cookie
  // exists — it never validates it. Enforcement is `requireUser()`.
  matcher: ["/((?!sign-in|api/auth|_next/static|_next/image|.*\\.).*)"],
};
