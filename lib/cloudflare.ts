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
  return { token, account, group };
}

async function cf<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = env();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json()) as {
    success: boolean;
    result?: T;
    errors?: { code: number; message: string }[];
  };
  if (!res.ok || !body.success) {
    const msg = body.errors?.map((e) => `${e.code}:${e.message}`).join("; ");
    throw new Error(`Cloudflare API ${res.status}: ${msg ?? "unknown error"}`);
  }
  return body.result as T;
}

export async function syncDocsAccessGroup() {
  const { account, group } = env();
  const profiles = await listProfiles();
  const emails = profiles.map((p) => p.email);

  // Empty include forbidden by CF; surface loudly rather than lock everyone out silently.
  if (!emails.length) {
    throw new Error("Refusing to sync empty allowlist to Cloudflare Access Group");
  }

  const current = await cf<AccessGroup>(
    `/accounts/${account}/access/groups/${group}`
  );

  const include = emails.map((email) => ({ email: { email } }));

  await cf<AccessGroup>(`/accounts/${account}/access/groups/${group}`, {
    method: "PUT",
    body: JSON.stringify({
      name: current.name,
      include,
      exclude: current.exclude ?? [],
      require: current.require ?? [],
    }),
  });
}
