import { supabase } from "../../lib/supabase";

type DeleteAccountResult = {
  deleted: true;
};

export async function deleteAccount(password: string): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const email = userData.user?.email;

  if (userError || !email) {
    throw new Error("Please sign in again before deleting your account.");
  }

  const { error: confirmationError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (confirmationError) {
    throw new Error("That password did not match. Your account has not been deleted.");
  }

  const { data, error } = await supabase.functions.invoke<DeleteAccountResult>("delete-account", {
    method: "POST",
    body: { confirmation: "DELETE" },
  });

  if (error || !data?.deleted) {
    const response = "context" in (error ?? {}) ? (error as { context?: Response }).context : null;
    let message = "We couldn't safely delete your account. Please try again or contact support.";

    if (response) {
      try {
        const body = (await response.clone().json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // Keep the safe customer-facing fallback when the service returns no JSON body.
      }
    }

    throw new Error(message);
  }

  // The server has removed the Auth user and all cascaded SavePixie data. Clear the
  // now-invalid browser session without making another network request.
  await supabase.auth.signOut({ scope: "local" });
}
