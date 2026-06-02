import "server-only";
import * as fs from "fs";

function loadTokens(): Map<string, string> {
  if (process.env.FLY_TOKENS) {
    try {
      return new Map(Object.entries(JSON.parse(process.env.FLY_TOKENS)));
    } catch {
      return new Map();
    }
  }
  try {
    const raw = fs.readFileSync("fly-tokens.json", "utf8");
    return new Map(Object.entries(JSON.parse(raw)));
  } catch {
    return new Map();
  }
}

export const flyTokens = loadTokens();
export const orgSlugs = [...flyTokens.keys()];
