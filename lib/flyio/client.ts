import { flyTokens } from "./config";

export async function flyFetch(
  url: string,
  orgSlug: string,
  init?: RequestInit
): Promise<Response> {
  const token = flyTokens.get(orgSlug);
  if (!token) throw new Error(`No token for org: ${orgSlug}`);
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}
