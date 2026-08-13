/**
 * Sign-in error codes and their user-facing copy.
 *
 * Better Auth reports OAuth callback failures by redirecting to the
 * `errorCallbackURL` with `?error=<code>`, where `<code>` is either one of its
 * own codes or the message of an `APIError` thrown from a database hook, with
 * spaces replaced by underscores. So the codes we throw in `lib/auth.ts` must
 * be single tokens — they travel through the URL verbatim.
 */

export const AUTH_ERROR = {
  emailNotAuthorised: "EMAIL_NOT_AUTHORISED",
  allowlistLookupFailed: "ALLOWLIST_LOOKUP_FAILED",
  accessRevoked: "ACCESS_REVOKED",
} as const;

const MESSAGES: Record<string, string> = {
  // Thrown by our own allowlist checks.
  [AUTH_ERROR.emailNotAuthorised]:
    "That Google account isn't on the WDCC exec list. Ask an exec with admin access to add your email, then try again.",
  [AUTH_ERROR.allowlistLookupFailed]:
    "We couldn't check your access just now. Try again in a moment.",
  [AUTH_ERROR.accessRevoked]:
    "Your access has been removed, so you've been signed out. Contact an exec with admin access if this is a mistake.",

  // Better Auth / Google callback codes.
  access_denied: "You cancelled the Google sign-in. Try again when ready.",
  account_not_linked:
    "An account already exists with this email but isn't linked to Google. Contact an exec with admin access.",
  signup_disabled: "Sign-ups are disabled for this dashboard.",
  email_not_found: "Google didn't share an email address for that account.",
  unable_to_create_user: "We couldn't create your account. Try again.",
  unable_to_create_session: "We couldn't start your session. Try again.",
  unable_to_get_user_info: "We couldn't read your Google profile. Try again.",
  state_mismatch: "Your sign-in link expired or was reused. Try again.",
  state_not_found: "Your sign-in link expired. Try again.",
  please_restart_the_process: "Your sign-in attempt expired. Try again.",
  invalid_callback_request: "That sign-in link isn't valid. Try again.",
  invalid_code: "Google rejected the sign-in attempt. Try again.",
  no_code: "Google didn't complete the sign-in. Try again.",
  oauth_provider_not_found:
    "Google sign-in isn't configured. Contact an exec with admin access.",
  internal_server_error: "Something broke on our end. Try again shortly.",
};

/** Turns a `?error=` code into copy we can show. Unknown codes get a fallback. */
export function authErrorMessage(code: string | null | undefined) {
  if (!code) return null;
  return (
    MESSAGES[code] ??
    MESSAGES[code.toLowerCase()] ??
    "Sign-in failed. Try again, and tell an exec with admin access if it keeps happening."
  );
}
