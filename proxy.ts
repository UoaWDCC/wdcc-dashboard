import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(req: NextRequest) {
  const session = getSessionCookie(req);
  if (!session) {
    const from = req.nextUrl.pathname + req.nextUrl.search;
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
