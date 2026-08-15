import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { AUTH_ERROR_CODES } from "@/lib/auth-errors";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getProfile, isAllowed, normalizeEmail } from "@/lib/profile";

export class NotAllowedError extends APIError {
  constructor() {
    super("FORBIDDEN", { message: AUTH_ERROR_CODES.EMAIL_NOT_ALLOWED });
  }
}

export class AllowlistLookupError extends APIError {
  constructor() {
    super("INTERNAL_SERVER_ERROR", {
      message: AUTH_ERROR_CODES.ALLOWLIST_LOOKUP_FAILED,
    });
  }
}

async function checkAllowed(email: string) {
  let allowed: boolean;
  try {
    allowed = await isAllowed(email);
  } catch (err) {
    console.error("[auth] profile lookup failed", err);
    throw new AllowlistLookupError();
  }
  if (!allowed) {
    // Deliberately no email: this is the expected outcome for anyone outside
    // the allowlist, and the log stream is retained.
    console.warn("[auth] sign-in rejected: email not on allowlist");
    throw new NotAllowedError();
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
  onAPIError: {
    errorURL: "/sign-in",
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
