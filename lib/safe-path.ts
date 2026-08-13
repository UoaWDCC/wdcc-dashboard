/**
 * Same rule Better Auth applies to relative `callbackURL`s
 * (`matchesOriginPattern` in `better-auth/dist/auth/trusted-origins.mjs`).
 *
 * Keeping the two in sync matters in both directions: a value we accept but it
 * rejects blocks sign-in with `INVALID_CALLBACK_URL`, and a value we accept but
 * never hand to it (a server-side `redirect()`) is an open redirect. The
 * negative lookahead is what stops `//evil.com` and `/\evil.com` — the browser
 * treats a backslash as a slash, so the latter resolves to a foreign authority.
 */
const SAFE_PATH = /^\/(?!\/|\\|%2f|%5c)[\w\-.+/@]*(?:\?[\w\-.+/=&%@]*)?$/i;

/** Narrows a `?from=` value to a same-origin path, falling back to `/`. */
export function safePath(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !SAFE_PATH.test(raw)) return "/";
  // A sign-in target that is itself the sign-in page just loops.
  if (raw === "/sign-in" || raw.startsWith("/sign-in?")) return "/";
  return raw;
}
