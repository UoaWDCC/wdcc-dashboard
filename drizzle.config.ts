import type { Config } from "drizzle-kit";
import { env } from "./lib/env";

export default {
  schema: "./lib/db/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
