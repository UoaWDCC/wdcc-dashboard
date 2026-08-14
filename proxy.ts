import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { safePath } from "@/lib/safe-path";

export function proxy(req: NextRequest) {
  const session = getSessionCookie(req);
  if (!session) {
    // A path Better Auth would reject as a callbackURL degrades to "/" here
    // rather than blocking sign-in later; the query is kept, re-encoded to fit
    // its charset.
    const from = safePath(req.nextUrl.pathname + req.nextUrl.search);
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    if (from !== "/") url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/marketing/:path*",
    "/tech/:path*",
    "/projects/:path*",
    "/admin/:path*",
    "/tasks/:path*",
    "/linktree/:path*",
  ],
};
