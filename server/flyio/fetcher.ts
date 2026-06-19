import { flyTokens } from "../../lib/flyio/config";

export async function flyFetch<T>(url: string, orgSlug: string): Promise<T> {
  const token = flyTokens.get(orgSlug);

  if (!token) {
    throw new Error(`No token configured for org: ${orgSlug}`);
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Fly API ${res.status} ${res.statusText} — ${url}`);
  }

  return res.json() as Promise<T>;
}
