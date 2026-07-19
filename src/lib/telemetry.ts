import { supabase } from "./supabase";

export type ClientErrorCode =
  | "render_fatal"
  | "session_load"
  | "profile_prepare"
  | "private_data_load"
  | "save_action"
  | "billing_status"
  | "billing_checkout"
  | "billing_portal"
  | "account_export"
  | "account_delete";

export type ClientErrorSurface = "auth" | "app" | "saving" | "billing" | "settings";

const reportedThisPage = new Set<string>();

/**
 * Sends one allow-listed operational signal per page load. The server receives
 * no free-text error, stack trace, route, email, savings value, device ID, or
 * customer metadata. Reporting is best-effort and must never interrupt saving.
 */
export function reportClientError(code: ClientErrorCode, surface: ClientErrorSurface): void {
  if (import.meta.env.DEV) return;

  const key = `${surface}:${code}`;
  if (reportedThisPage.has(key)) return;
  reportedThisPage.add(key);

  void supabase.functions
    .invoke("report-client-error", {
      method: "POST",
      body: { code, surface },
    })
    .then(({ error }) => {
      if (error) reportedThisPage.delete(key);
    })
    .catch(() => reportedThisPage.delete(key));
}
