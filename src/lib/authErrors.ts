import { isAuthApiError } from "@supabase/supabase-js";

const AUTH_MESSAGES: Record<string, string> = {
  email_address_invalid: "Enter a valid email address.",
  email_not_confirmed: "Confirm your email from your inbox before signing in.",
  invalid_credentials: "That email and password combination doesn’t match.",
  over_email_send_rate_limit: "Too many emails were requested. Wait a little, then try again.",
  over_request_rate_limit: "Too many attempts were made. Wait a little, then try again.",
  same_password: "Choose a password you haven’t used for this account.",
  session_expired: "Your secure link has expired. Request a new one and try again.",
  signup_disabled: "New accounts are temporarily paused. Contact SavePixie support for help.",
  user_already_exists:
    "An account already uses that email. Try signing in or resetting the password.",
  weak_password: "Choose a stronger password with at least eight characters.",
};

export function friendlyAuthError(cause: unknown, fallback: string): string {
  if (isAuthApiError(cause)) {
    return AUTH_MESSAGES[cause.code ?? ""] ?? fallback;
  }

  if (cause instanceof TypeError) {
    return "SavePixie couldn’t reach the sign-in service. Check your connection and try again.";
  }

  return fallback;
}
