import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { isAllowedEmail } from "@/lib/allowlist";

export class NotAllowedError extends Error {
  // intentionally not re-exporting isAllowedEmail; import from @/lib/allowlist

  code = "NOT_ALLOWED";
}

export class AllowlistLookupError extends Error {
  code = "ALLOWLIST_LOOKUP_FAILED";
}

async function checkAllowed(email: string) {
  let allowed: boolean;
  try {
    allowed = await isAllowedEmail(email);
  } catch (err) {
    console.error("[auth] allowlist lookup failed", err);
    throw new AllowlistLookupError("Allowlist check failed. Try again later.");
  }
  if (!allowed) throw new NotAllowedError(`Email ${email} is not authorised.`);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: { enabled: false },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          await checkAllowed(user.email);
          return { data: user };
        },
      },
      update: {
        before: async (data) => {
          if (data.email) await checkAllowed(data.email);
          return { data };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
