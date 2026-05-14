import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { getProfile, isAllowed, normalizeEmail } from "@/lib/profile";

export class NotAllowedError extends Error {
  code = "NOT_ALLOWED";
}

export class AllowlistLookupError extends Error {
  code = "ALLOWLIST_LOOKUP_FAILED";
}

async function checkAllowed(email: string) {
  let allowed: boolean;
  try {
    allowed = await isAllowed(email);
  } catch (err) {
    console.error("[auth] profile lookup failed", err);
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
          const email = normalizeEmail(user.email);
          await checkAllowed(email);
          const p = await getProfile(email);
          return {
            data: {
              ...user,
              email,
              name: p?.name ?? user.name,
            },
          };
        },
      },
      update: {
        before: async (data) => {
          if (!data.email) return { data };
          const email = normalizeEmail(data.email);
          await checkAllowed(email);
          return { data: { ...data, email } };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
