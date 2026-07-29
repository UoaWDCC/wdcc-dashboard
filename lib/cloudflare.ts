import { listProfiles } from "@/lib/profile";

const API = "https://api.cloudflare.com/client/v4";

type AccessGroup = {
  id: string;
  name: string;
  include: unknown[];
  exclude?: unknown[];
  require?: unknown[];
};

function env() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const group = process.env.CLOUDFLARE_ACCESS_GROUP_ID;
  if (!token || !account || !group) {
    throw new Error(
      "Missing Cloudflare env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_ACCESS_GROUP_ID"
    );
  }
  return { token, account, group, groupName: process.env.CLOUDFLARE_ACCESS_GROUP_NAME };
}

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = env();
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  // CF proxies/timeouts can return HTML or plain text on failure. Read as text
  // first so the real status/body appears in the error instead of a SyntaxError.
  const text = await res.text();
  let body: { success?: boolean; result?: T; errors?: { code: number; message: string }[] };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Cloudflare API ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!res.ok || !body.success) {
    const msg = body.errors?.map((e) => `${e.code}:${e.message}`).join("; ");
    const detail = msg || text.slice(0, 200) || "unknown error";
    throw new Error(`Cloudflare API ${res.status}: ${detail}`);
  }
  return body.result as T;
}

// Serialize CF syncs in-process so concurrent admin actions can't clobber each
// other via GET-then-PUT race.
let syncChain: Promise<unknown> = Promise.resolve();

export function syncDocsAccessGroup(): Promise<void> {
  const run = syncChain.then(runSync, runSync);
  syncChain = run.catch(() => {});
  return run;
}

async function runSync() {
  const { account, group, groupName } = env();
  const profiles = await listProfiles();
  // Only personal mailboxes are login identities. Shared mailboxes exist as
  // task assignees but must never be granted Zero Trust access.
  const emails = profiles.filter((p) => p.kind === "personal").map((p) => p.email);

  // Refuse to push an empty allowlist: CF rejects empty include, and writing a
  // deny-all sentinel would lock every admin out of the docs (and out of the
  // admin surface itself if it's fronted by the same access group). If this
  // fires, the DB is in an unexpected state and needs manual reconciliation.
  if (!emails.length) {
    throw new Error("Refusing to sync empty personal-email allowlist to Cloudflare");
  }
  const include = emails.map((email) => ({ email: { email } }));

  // If CLOUDFLARE_ACCESS_GROUP_NAME is set, PUT a canonical object. This makes
  // writes idempotent so concurrent instances converge instead of racing on
  // GET-then-PUT. Fall back to GET-then-PUT to preserve name when unset.
  let name = groupName;
  let exclude: unknown[] = [];
  let require: unknown[] = [];
  if (!name) {
    const current = await cf<AccessGroup>(
      `/accounts/${account}/access/groups/${group}`
    );
    name = current.name;
    exclude = current.exclude ?? [];
    require = current.require ?? [];
  }

  await cf<AccessGroup>(`/accounts/${account}/access/groups/${group}`, {
    method: "PUT",
    body: JSON.stringify({ name, include, exclude, require }),
  });
}
