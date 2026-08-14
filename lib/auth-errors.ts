export const AUTH_ERROR_CODES = {
  EMAIL_NOT_ALLOWED: "email_not_allowed",
  ALLOWLIST_LOOKUP_FAILED: "allowlist_lookup_failed",
  ACCESS_REVOKED: "access_revoked",
  SERVER_ERROR: "server_error",
} as const;

export type AuthErrorMessage = {
  title: string;
  description: string;
  code?: string;
};

const MESSAGES: Record<string, AuthErrorMessage> = {
  [AUTH_ERROR_CODES.EMAIL_NOT_ALLOWED]: {
    title: "That account isn't on the allowlist",
    description:
      "Your Google account isn't on the exec allowlist. Ask an exec to add you, then try again.",
  },
  [AUTH_ERROR_CODES.ALLOWLIST_LOOKUP_FAILED]: {
    title: "We couldn't check your access",
    description:
      "We couldn't reach the database to confirm your access. Please try again in a moment.",
  },
  internal_server_error: {
    title: "We couldn't check your access",
    description:
      "We couldn't reach the database to confirm your access. Please try again in a moment.",
  },
  access_denied: {
    title: "Sign-in cancelled",
    description:
      "You cancelled the Google sign-in prompt. Try again when you're ready.",
  },
  [AUTH_ERROR_CODES.ACCESS_REVOKED]: {
    title: "Your access was removed",
    description:
      "Your profile is no longer on the exec allowlist, so you've been signed out. Ask an exec to restore your access.",
  },
  [AUTH_ERROR_CODES.SERVER_ERROR]: {
    title: "Something went wrong",
    description: "Something went wrong on our end. Please try again.",
  },
  state_not_found: {
    title: "Sign-in expired",
    description:
      "That sign-in attempt expired or was interrupted. Please start again.",
  },
  please_restart_the_process: {
    title: "Sign-in expired",
    description:
      "That sign-in attempt expired or was interrupted. Please start again.",
  },
  state_mismatch: {
    title: "Sign-in expired",
    description:
      "That sign-in attempt expired or was interrupted. Please start again.",
  },
  invalid_callback_request: {
    title: "Something went wrong",
    description: "Something went wrong on our end. Please try again.",
  },
};

export function getAuthErrorMessage(
  code: string,
  description?: string
): AuthErrorMessage {
  const known = MESSAGES[code];
  if (known) return known;
  return {
    title: "Sign-in failed",
    description:
      description?.slice(0, 200) ??
      "We couldn't sign you in. Please try again, or ask an exec for help.",
    code,
  };
}
