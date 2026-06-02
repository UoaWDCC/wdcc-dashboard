// NOTE: fs is Node-only — this file and anything that imports it cannot be used in Client Components.
// For explicit build-time protection, install the "server-only" package as recommended by Next.js.
import * as fs from "fs";

function loadTokens(): Map<string, string> {
  if (process.env.FLY_TOKENS) {
    try {
      return new Map(Object.entries(JSON.parse(process.env.FLY_TOKENS)));
    } catch (e) {
      console.error("[flyio] Failed to parse FLY_TOKENS env var:", e);
      return new Map();
    }
  }

  try {
    const raw = fs.readFileSync("fly-tokens.json", "utf8");
    return new Map(Object.entries(JSON.parse(raw)));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[flyio] Failed to load fly-tokens.json:", e);
    }
    return new Map();
  }
}

export const flyTokens = loadTokens();
export const orgSlugs = [...flyTokens.keys()];
