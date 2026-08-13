import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { AUTH_ERROR } from "@/lib/auth-errors";
import { getProfile, isAllowed, normalizeEmail } from "@/lib/profile";

/**
 * Throws an `APIError` whose message is a bare code: Better Auth puts that
 * message straight into the `?error=` param of the sign-in redirect, where
 * `lib/auth-errors.ts` turns it back into copy for the user.
 */
async function checkAllowed(email: string) {
  let allowed: boolean;
  try {
    allowed = await isAllowed(email);
  } catch (err) {
    console.error("[auth] profile lookup failed", err);
    throw new APIError("INTERNAL_SERVER_ERROR", {
      message: AUTH_ERROR.allowlistLookupFailed,
      code: AUTH_ERROR.allowlistLookupFailed,
    });
  }
  if (!allowed) {
    console.warn(`[auth] rejected sign-in for unlisted email ${email}`);
    throw new APIError("FORBIDDEN", {
      message: AUTH_ERROR.emailNotAuthorised,
      code: AUTH_ERROR.emailNotAuthorised,
    });
  }
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
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
