import "server-only";

import { z } from "zod";
import { listProfiles } from "@/server/profile/queries";

const API = "https://api.cloudflare.com/client/v4";

type AccessGroup = {
  id: string;
  name: string;
  include: unknown[];
  exclude?: unknown[];
  require?: unknown[];
};

const envSchema = z.object({
  CLOUDFLARE_API_TOKEN: z.string().min(1),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_ACCESS_GROUP_ID: z.string().min(1),
  CLOUDFLARE_ACCESS_GROUP_NAME: z.string().min(1).optional(),
});

function env() {
  const parsed = envSchema.safeParse({
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_ACCESS_GROUP_ID: process.env.CLOUDFLARE_ACCESS_GROUP_ID,
    // "" means unset here — it selects the GET-then-PUT fallback in runSync.
    CLOUDFLARE_ACCESS_GROUP_NAME:
      process.env.CLOUDFLARE_ACCESS_GROUP_NAME || undefined,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid Cloudflare environment variables:\n${issues}`);
  }
  return {
    token: parsed.data.CLOUDFLARE_API_TOKEN,
    account: parsed.data.CLOUDFLARE_ACCOUNT_ID,
    group: parsed.data.CLOUDFLARE_ACCESS_GROUP_ID,
    groupName: parsed.data.CLOUDFLARE_ACCESS_GROUP_NAME,
  };
}

async function cloudflare<T>(path: string, init?: RequestInit): Promise<T> {
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
  let body: {
    success?: boolean;
    result?: T;
    errors?: { code: number; message: string }[];
  };
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
  // Both kinds get docs access. Shared mailboxes are not login identities, but
  // the docs group is about who may read the site, not who may sign in here.
  const emails = profiles.map((p) => p.email);

  // Refuse to push an empty allowlist: CF rejects empty include, and writing a
  // deny-all sentinel would lock every admin out of the docs (and out of the
  // admin surface itself if it's fronted by the same access group). If this
  // fires, the DB is in an unexpected state and needs manual reconciliation.
  if (!emails.length) {
    throw new Error("Refusing to sync empty allowlist to Cloudflare");
  }
  const include = emails.map((email) => ({ email: { email } }));

  // If CLOUDFLARE_ACCESS_GROUP_NAME is set, PUT a canonical object. This makes
  // writes idempotent so concurrent instances converge instead of racing on
  // GET-then-PUT. Fall back to GET-then-PUT to preserve name when unset.
  let name = groupName;
  let exclude: unknown[] = [];
  let require: unknown[] = [];
  if (!name) {
    const current = await cloudflare<AccessGroup>(
      `/accounts/${account}/access/groups/${group}`
    );
    name = current.name;
    exclude = current.exclude ?? [];
    require = current.require ?? [];
  }

  await cloudflare<AccessGroup>(`/accounts/${account}/access/groups/${group}`, {
    method: "PUT",
    body: JSON.stringify({ name, include, exclude, require }),
  });
}
