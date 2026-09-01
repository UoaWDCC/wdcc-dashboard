import "server-only";

import { after } from "next/server";

// The go app (go.wdcc.co.nz) caches its link list. This endpoint drops that
// cache so an edit here shows up there immediately.
const REVALIDATE_URL =
  process.env.GO_REVALIDATE_URL ?? "https://go.wdcc.co.nz/api/revalidate";

export async function revalidateGoSite(): Promise<void> {
  const secret = process.env.WDCC_INTERNAL_KEY;
  if (!secret) throw new Error("WDCC_INTERNAL_KEY is not set");

  const res = await fetch(REVALIDATE_URL, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { "x-revalidate-secret": secret },
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200) || "unknown error";
    throw new Error(`Go revalidate ${res.status}: ${detail}`);
  }
}

// Fire the purge after the response so a write isn't blocked on go.wdcc.co.nz
// latency. On failure the DB truth stands and the go app catches up on its own
// revalidation interval.
export function scheduleGoRevalidate(context: string) {
  after(async () => {
    try {
      await revalidateGoSite();
    } catch (err) {
      console.error(`[${context}] revalidateGoSite failed:`, err);
    }
  });
}
