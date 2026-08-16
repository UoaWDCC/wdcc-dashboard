import { getFirstElement } from "@/lib/utils";

export const AUTH_ERROR_CODES = {
  EMAIL_NOT_ALLOWED: "email_not_allowed",
  ALLOWLIST_LOOKUP_FAILED: "allowlist_lookup_failed",
  ACCESS_REVOKED: "access_revoked",
  SERVER_ERROR: "server_error",
} as const;

export const BETTER_AUTH_ERROR_CODES = {
  INTERNAL_SERVER_ERROR: "internal_server_error",
  ACCESS_DENIED: "access_denied",
  STATE_MISMATCH: "state_mismatch",
  PLEASE_RESTART_THE_PROCESS: "please_restart_the_process",
  INVALID_CALLBACK_REQUEST: "invalid_callback_request",
  STATE_NOT_FOUND: "state_not_found",
  NO_CODE: "no_code",
  INVALID_CODE: "invalid_code",
  UNABLE_TO_GET_USER_INFO: "unable_to_get_user_info",
  EMAIL_NOT_FOUND: "email_not_found",
  OAUTH_PROVIDER_NOT_FOUND: "oauth_provider_not_found",
  NO_CALLBACK_URL: "no_callback_url",
} as const;

type KnownAuthErrorCode =
  | (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES]
  | (typeof BETTER_AUTH_ERROR_CODES)[keyof typeof BETTER_AUTH_ERROR_CODES];

export type AuthErrorMessage = {
  title: string;
  description: string;
};

const EXPIRED: AuthErrorMessage = {
  title: "Sign-in expired",
  description:
    "That sign-in attempt expired or was interrupted. Please start again",
};

const LOOKUP_FAILED: AuthErrorMessage = {
  title: "We couldn't check your access",
  description:
    "We couldn't reach the database to confirm your access. Please try again in a moment.",
};

const EMAIL_NOT_ALLOWED: AuthErrorMessage = {
  title: "That account isn't on the allowlist",
  description:
    "Your Google account isn't on the exec allowlist. Ask an exec to add you, then try again.",
};

const INCOMPLETE_SIGNIN: AuthErrorMessage = {
  title: "Google sign-in didn't complete",
  description: "Sign-in was not completed. Please try again.",
};

const GENERIC: AuthErrorMessage = {
  title: "Sign-in failed",
  description:
    "We couldn't sign you in. Please try again, or ask an exec for help.",
};

const MESSAGES: Record<KnownAuthErrorCode, AuthErrorMessage> = {
  [AUTH_ERROR_CODES.EMAIL_NOT_ALLOWED]: EMAIL_NOT_ALLOWED,
  [AUTH_ERROR_CODES.ACCESS_REVOKED]: EMAIL_NOT_ALLOWED,
  [BETTER_AUTH_ERROR_CODES.EMAIL_NOT_FOUND]: EMAIL_NOT_ALLOWED,
  [AUTH_ERROR_CODES.ALLOWLIST_LOOKUP_FAILED]: LOOKUP_FAILED,
  [BETTER_AUTH_ERROR_CODES.INTERNAL_SERVER_ERROR]: LOOKUP_FAILED,
  [BETTER_AUTH_ERROR_CODES.ACCESS_DENIED]: INCOMPLETE_SIGNIN,
  [BETTER_AUTH_ERROR_CODES.INVALID_CODE]: INCOMPLETE_SIGNIN,
  [BETTER_AUTH_ERROR_CODES.UNABLE_TO_GET_USER_INFO]: INCOMPLETE_SIGNIN,
  [BETTER_AUTH_ERROR_CODES.STATE_NOT_FOUND]: EXPIRED,
  [BETTER_AUTH_ERROR_CODES.PLEASE_RESTART_THE_PROCESS]: EXPIRED,
  [BETTER_AUTH_ERROR_CODES.STATE_MISMATCH]: EXPIRED,
  [BETTER_AUTH_ERROR_CODES.NO_CODE]: EXPIRED,
  [AUTH_ERROR_CODES.SERVER_ERROR]: GENERIC,
  [BETTER_AUTH_ERROR_CODES.INVALID_CALLBACK_REQUEST]: GENERIC,
  [BETTER_AUTH_ERROR_CODES.OAUTH_PROVIDER_NOT_FOUND]: GENERIC,
  [BETTER_AUTH_ERROR_CODES.NO_CALLBACK_URL]: GENERIC,
};

export function resolveAuthErrorCode(params: {
  [key: string]: string | string[] | undefined;
}): string | undefined {
  const error = getFirstElement(params.error);
  if (error) return error;
  const state = getFirstElement(params.state);
  return state == BETTER_AUTH_ERROR_CODES.STATE_NOT_FOUND ? state : undefined;
}

export function getAuthErrorMessage(code: string): AuthErrorMessage {
  if (Object.hasOwn(MESSAGES, code)) {
    return MESSAGES[code as KnownAuthErrorCode];
  }

  return GENERIC;
}
