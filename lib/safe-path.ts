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

/**
 * Percent-encodes from the code point rather than delegating to
 * `encodeURIComponent`, which by spec leaves `!` `~` `*` `'` `(` `)` alone —
 * all six pass `SAFE_QUERY` but are rejected by Better Auth. `SAFE_QUERY`
 * admits only ASCII, so a single byte per character is enough.
 */
function encodeForCallback(query: string) {
  return query.replace(
    OUTSIDE_CALLBACK_CHARSET,
    (char) =>
      "%" + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")
  );
}

/**
 * Takes the first of a search param's values: `searchParams` hands back an
 * array whenever a key is repeated, and a repeat is the caller's problem to
 * ignore rather than ours to reject.
 */
export function firstParam(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/** Narrows a `?from=` value to a same-origin path, falling back to `/`. */
export function safePath(value: string | string[] | undefined) {
  const raw = firstParam(value);
  if (!raw) return "/";

  const mark = raw.indexOf("?");
  const pathname = mark === -1 ? raw : raw.slice(0, mark);
  const query = mark === -1 ? "" : raw.slice(mark + 1);

  if (!SAFE_PATHNAME.test(pathname) || !SAFE_QUERY.test(query)) return "/";
  // `.` and `/` are both inside the charset above, so `/..//evil.com` and
  // `/.//evil.com` pass it. Nothing in this stack normalizes that today, but an
  // upstream proxy that did would turn either into a protocol-relative URL.
  if (pathname.split("/").some((seg) => seg === "." || seg === ".."))
    return "/";
  // A sign-in target that is itself the sign-in page just loops. Trailing
  // slashes come off first because `SAFE_PATHNAME` admits `/sign-in/`, which
  // only fails to reach here while `trailingSlash` is left at its default.
  if ((pathname.replace(/\/+$/, "") || "/") === "/sign-in") return "/";

  return query ? `${pathname}?${encodeForCallback(query)}` : pathname;
}
