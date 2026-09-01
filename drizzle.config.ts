import type { Config } from "drizzle-kit";
import { env } from "./server/env";

export default {
  schema: "./server/db/schema",
  out: "./server/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
} satisfies Config;
