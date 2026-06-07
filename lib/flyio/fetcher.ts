import { flyTokens } from "./config";

export async function flyFetch<T>(url: string, orgSlug: string): Promise<T | null> {
  const token = flyTokens.get(orgSlug);

  if (!token) {
    console.error(`[flyio] No token for org: ${orgSlug}`);
    return null;
  }

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) return null;

    return await res.json() as T;
  } catch (e) {
    console.error(`[flyio] Request failed for ${url}:`, e);
    return null;
  }
}
