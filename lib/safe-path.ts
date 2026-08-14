/**
 * Same rule Better Auth applies to relative `callbackURL`s
 * (`matchesOriginPattern` in `better-auth/dist/auth/trusted-origins.mjs`),
 * split into its path and query halves so each can be checked on its own.
 *
 * Keeping the two in sync matters in both directions: a value it accepts but we
 * reject blocks sign-in with `INVALID_CALLBACK_URL`, and a value we accept but
 * never hand to it (a server-side `redirect()`) is an open redirect. The
 * negative lookahead is what stops `//evil.com` and `/\evil.com` — the browser
 * treats a backslash as a slash, so the latter resolves to a foreign authority.
 */
const SAFE_PATHNAME = /^\/(?!\/|\\|%2f|%5c)[\w\-.+/@]*$/i;

/**
 * The RFC 3986 query charset, which is wider than the one Better Auth accepts —
 * a real query string carries `,` `:` `;` `[` `]`. Anything outside Better
 * Auth's own set is percent-encoded on the way out by `encodeForCallback`, so a
 * link like `/tasks?tags=a,b` survives sign-in instead of degrading to `/`.
 */
const SAFE_QUERY = /^[\w\-.+/=&%@!$'()*,;:[\]~?]*$/;

/** Everything Better Auth's query charset leaves out. */
const OUTSIDE_CALLBACK_CHARSET = /[^\w\-.+/=&%@]/g;

function encodeForCallback(query: string) {
  return query.replace(OUTSIDE_CALLBACK_CHARSET, (char) =>
    encodeURIComponent(char)
  );
}

/** Narrows a `?from=` value to a same-origin path, falling back to `/`. */
export function safePath(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/";

  const mark = raw.indexOf("?");
  const pathname = mark === -1 ? raw : raw.slice(0, mark);
  const query = mark === -1 ? "" : raw.slice(mark + 1);

  if (!SAFE_PATHNAME.test(pathname) || !SAFE_QUERY.test(query)) return "/";
  // `.` and `/` are both inside the charset above, so `/..//evil.com` passes it.
  // Nothing in this stack normalizes that today, but an upstream proxy that did
  // would turn it into a protocol-relative URL.
  if (pathname.split("/").includes("..")) return "/";
  // A sign-in target that is itself the sign-in page just loops.
  if (pathname === "/sign-in") return "/";

  return query ? `${pathname}?${encodeForCallback(query)}` : pathname;
}
