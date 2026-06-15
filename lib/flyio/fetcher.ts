import { flyTokens } from "./config";

export async function flyFetch(url: string, orgSlug: string): Promise<Response> {
  const token = flyTokens.get(orgSlug);
  if (!token) throw new Error(`No token for org: ${orgSlug}`);
  
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}
