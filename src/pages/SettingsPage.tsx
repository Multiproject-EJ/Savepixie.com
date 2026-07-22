import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import { useSavings, type SavingsHomeInput } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import { createAccountExport, downloadAccountExport } from "../features/account/export";
import { deleteAccount } from "../features/account/api";
import {
  createCheckoutSession,
  createPortalSession,
  fetchEntitlement,
  type Entitlement,
} from "../features/billing/api";
import type { SavingsHome } from "../features/goals/types";
import { reportClientError } from "../lib/telemetry";
import { useModalDialog } from "../lib/useModalDialog";

export function SettingsPage() {
  const { basePath } = useOutletContext<AppShellOutletContext>();
  const { user, signOut } = useAuth();
  const { displayName, profile, savingsHomes, updateHome } = useSavings();
  const navigate = useNavigate();
  const isPreview = basePath === "/preview/app";
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "success" | "error">("idle");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [billingState, setBillingState] = useState<"loading" | "ready" | "opening" | "error">(
    isPreview ? "ready" : "loading"
  );
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const deleteDialogRef = useModalDialog<HTMLFormElement>(
    deleteDialogOpen,
    () => setDeleteDialogOpen(false),
    !deleting
  );
  const billingEnabled = import.meta.env.VITE_STRIPE_ENABLED === "true";
  const hasPro = entitlement?.has_pro_access === true;
  const hasManageableSubscription = Boolean(
    entitlement &&
      !["inactive", "canceled", "incomplete_expired"].includes(entitlement.subscription_status)
  );
  const isBillingDemo = !billingEnabled && !hasManageableSubscription;
  const billingTiming = entitlement?.cancel_at
    ? `Cancels ${formatBillingDate(entitlement.cancel_at)}`
    : entitlement?.subscription_status === "trialing" && entitlement.trial_ends_at
      ? `Trial ends ${formatBillingDate(entitlement.trial_ends_at)}`
      : hasPro
        ? "Active subscription"
        : null;

  useEffect(() => {
    if (isPreview || !user?.id) return;

    let active = true;
    setBillingState("loading");
    void fetchEntitlement(user.id)
      .then((nextEntitlement) => {
        if (!active) return;
        setEntitlement(nextEntitlement);
        setBillingState("ready");
      })
      .catch((cause) => {
        if (!active) return;
        reportClientError("billing_status", "billing");
        setBillingState("error");
        setBillingMessage(
          cause instanceof Error ? cause.message : "We couldn't load your plan status."
        );
      });

    return () => {
      active = false;
    };
  }, [isPreview, user?.id]);

  const openBilling = async (destination: "checkout" | "portal") => {
    if (
      isPreview ||
      (destination === "checkout" && !billingEnabled) ||
      (destination === "portal" && !hasManageableSubscription)
    ) {
      return;
    }
    setBillingState("opening");
    setBillingMessage(null);
    try {
      const url =
        destination === "checkout" ? await createCheckoutSession() : await createPortalSession();
      window.location.assign(url);
    } catch (cause) {
      reportClientError(
        destination === "checkout" ? "billing_checkout" : "billing_portal",
        "billing"
      );
      setBillingState("error");
      setBillingMessage(
        cause instanceof Error ? cause.message : "We couldn't open secure billing."
      );
    }
  };

  const exportData = async () => {
    if (!user?.id || isPreview) return;
    setExporting(true);
    setExportMessage(null);
    setExportStatus("idle");
    try {
      const data = await createAccountExport(user.id);
      downloadAccountExport(data);
      setExportStatus("success");
      setExportMessage("Your private JSON export is ready.");
    } catch (cause) {
      reportClientError("account_export", "settings");
      setExportStatus("error");
      setExportMessage(cause instanceof Error ? cause.message : "We couldn't prepare your export.");
    } finally {
      setExporting(false);
    }
  };

  const handleSignOut = async () => {
    if (isPreview) {
      navigate("/");
      return;
    }
    setSigningOut(true);
    setSignOutMessage(null);
    try {
      await signOut();
      navigate("/");
    } catch {
      setSignOutMessage("We couldn’t sign you out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const handleDeleteAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (deleteConfirmation !== "DELETE" || !deletePassword || isPreview) return;

    setDeleting(true);
    setDeleteMessage(null);
    try {
      await deleteAccount(deletePassword);
      navigate("/?account=deleted", { replace: true });
    } catch (cause) {
      reportClientError("account_delete", "settings");
      setDeleteMessage(
        cause instanceof Error
          ? cause.message
          : "We couldn't safely delete your account. Please contact support."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="app-page settings-page">
      <header className="page-heading settings-heading">
        <div>
          <span className="eyebrow">Your space, your choices</span>
          <h1>Account &amp; settings</h1>
          <p>Keep the important controls close without crowding your daily saving loop.</p>
        </div>
        <Link className="button secondary compact-button" to={`${basePath}/today`}>
          Back to Today
        </Link>
      </header>

      <section className="settings-profile-card surface-card">
        <span className="profile-avatar profile-avatar--large">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <span className="eyebrow">SavePixie account</span>
          <h2>{displayName}</h2>
          <p>{user?.email ?? (isPreview ? "preview@savepixie.com" : "Email unavailable")}</p>
          {profile?.username ? <small>@{profile.username}</small> : null}
        </div>
        <span className="settings-plan-pill">
          {billingState === "loading"
            ? "Checking plan…"
            : billingState === "error"
              ? "Plan unavailable"
              : hasPro
                ? "Pro · Active"
                : "Basic · Free"}
        </span>
      </section>

      <section className={`surface-card pro-plan-card ${hasPro ? "pro-plan-card--active" : ""}`}>
        <div className="pro-plan-card__spark" aria-hidden="true">
          ✦
        </div>
        <div className="pro-plan-card__copy">
          <span className="eyebrow">SavePixie Pro{isBillingDemo ? " · Demo" : ""}</span>
          <h2>
            {hasPro ? "Your bigger Circles are unlocked" : "More Circles, still one calm app"}
          </h2>
          <p>
            Basic includes unlimited solo saving and one shared Pact with one companion. Pro unlocks
            additional Pacts and family or group Circles with up to ten savers.
          </p>
          <ul>
            <li>Every saver keeps money in their own 1:1 Savings Home</li>
            <li>Privacy controls stay with each person</li>
            <li>Existing Circles are never removed if Pro ends</li>
          </ul>
          {billingTiming ? <span className="pro-plan-card__status">{billingTiming}</span> : null}
          {billingMessage ? (
            <p className="pro-plan-card__message" role="alert">
              {billingMessage}
            </p>
          ) : null}
        </div>
        <div className="pro-plan-card__offer">
          <strong>29 kr</strong>
          <span>per month</span>
          {isBillingDemo ? (
            <small>Demo pricing</small>
          ) : !entitlement ? (
            <small>7 days free first</small>
          ) : (
            <small>Renews monthly</small>
          )}
          <button
            className="button primary"
            type="button"
            onClick={() =>
              void openBilling(hasPro || hasManageableSubscription ? "portal" : "checkout")
            }
            disabled={
              isPreview ||
              (isBillingDemo && !hasManageableSubscription) ||
              billingState === "loading" ||
              billingState === "opening"
            }
          >
            {isPreview
              ? "Preview only"
              : isBillingDemo
                ? "Payments not live yet"
                : billingState === "opening"
                  ? "Opening Stripe…"
                  : hasPro || hasManageableSubscription
                    ? "Manage billing"
                    : entitlement
                      ? "Restart Pro"
                      : "Start 7-day free trial"}
          </button>
          <small className="pro-plan-card__terms">
            {isBillingDemo
              ? "Demo pricing only. No card or payment can be entered yet."
              : !entitlement
                ? "Then 29 kr/month until cancelled. Cancel before the trial ends to avoid a charge."
                : hasPro || hasManageableSubscription
                  ? "29 kr/month until cancelled. Manage or cancel securely in Stripe."
                  : "Restart at 29 kr/month with no new free trial. Cancel securely in Stripe."}
          </small>
        </div>
      </section>

      <section className="settings-section">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Where your savings really live</span>
            <h2>Savings Homes</h2>
            <p>SavePixie never holds these funds. Keep the 1:1 account details accurate.</p>
          </div>
        </header>
        <div className="settings-home-grid">
          {savingsHomes.map((home) => (
            <SavingsHomeEditor key={home.id} home={home} onSave={updateHome} />
          ))}
        </div>
      </section>

      <section className="settings-grid">
        <article className="surface-card settings-control-card">
          <span className="settings-control-card__icon" aria-hidden="true">
            ⇩
          </span>
          <div>
            <span className="eyebrow">Portable by design</span>
            <h2>Export my data</h2>
            <p>
              Download your profile, Savings Homes, Pacts, your own entries, and weekly plans as a
              readable JSON file.
            </p>
          </div>
          <button
            className="button secondary"
            type="button"
            onClick={exportData}
            disabled={exporting || isPreview}
          >
            {isPreview ? "Available when signed in" : exporting ? "Preparing…" : "Download export"}
          </button>
          {exportMessage ? (
            <p
              className={`settings-inline-message settings-inline-message--${exportStatus}`}
              role={exportStatus === "error" ? "alert" : "status"}
            >
              {exportMessage}
            </p>
          ) : null}
        </article>

        <article className="surface-card settings-control-card">
          <span className="settings-control-card__icon" aria-hidden="true">
            ?
          </span>
          <div>
            <span className="eyebrow">A human route</span>
            <h2>Help &amp; support</h2>
            <p>Questions, accessibility needs, or something that does not feel right? Tell us.</p>
          </div>
          <a className="button secondary" href="mailto:support@savepixie.com">
            Email support
          </a>
        </article>
      </section>

      <section className="surface-card settings-account-actions">
        <div>
          <span className="eyebrow">Account controls</span>
          <h2>Sign out or delete your account</h2>
          <p>
            Deletion removes the SavePixie account and saving records. It never affects money held
            at your bank.
          </p>
        </div>
        <div className="settings-account-actions__buttons">
          <button
            className="button secondary"
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {isPreview ? "Leave preview" : signingOut ? "Signing out…" : "Sign out"}
          </button>
          <button
            className="button danger-button"
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {isPreview ? "Preview deletion safety" : "Delete account"}
          </button>
        </div>
        {signOutMessage ? (
          <p className="settings-sign-out-error" role="alert">
            {signOutMessage}
          </p>
        ) : null}
        <small>
          This permanently removes your SavePixie records. A shared Pact with active members is
          handed to its longest-standing remaining member; export anything you want to keep first.
        </small>
      </section>

      {deleteDialogOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => !deleting && setDeleteDialogOpen(false)}
        >
          <form
            ref={deleteDialogRef}
            className="pixie-modal account-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-delete-title"
            tabIndex={-1}
            onSubmit={handleDeleteAccount}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">Permanent account action</span>
            <h2 id="account-delete-title">Delete your SavePixie account?</h2>
            <p>
              This deletes your login, profile, Savings Homes, plans, and personal saving records.
              Shared Pacts continue for their remaining members. It does not—and cannot—touch money
              held in your real bank account.
            </p>
            <div className="account-delete-modal__notice">
              <strong>Before you continue</strong>
              <span>
                Download your data first if you want a copy. If you have Pro, cancel it in Billing
                before deleting the account.
              </span>
            </div>
            <label>
              <span>Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                disabled={deleting}
                required
              />
            </label>
            <label>
              <span>
                Type <strong>DELETE</strong> to confirm
              </span>
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                disabled={deleting}
                required
              />
            </label>
            {deleteMessage ? (
              <p className="account-delete-modal__error" role="alert">
                {deleteMessage}
              </p>
            ) : null}
            <div className="account-delete-modal__actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Keep my account
              </button>
              <button
                className="button danger-button"
                type="submit"
                disabled={
                  isPreview || deleting || deleteConfirmation !== "DELETE" || !deletePassword
                }
              >
                {isPreview
                  ? "Preview only"
                  : deleting
                    ? "Deleting securely…"
                    : "Permanently delete"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function formatBillingDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function SavingsHomeEditor({
  home,
  onSave,
}: {
  home: SavingsHome;
  onSave: (input: SavingsHomeInput & { id: string }) => Promise<SavingsHome>;
}) {
  const [label, setLabel] = useState(home.label);
  const [providerName, setProviderName] = useState(home.provider_name ?? "");
  const [accountHint, setAccountHint] = useState(home.account_hint ?? "");
  const [reportedBalance, setReportedBalance] = useState(
    home.reported_balance_cents === null ? "" : String(home.reported_balance_cents / 100)
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setMessage(null);
    const parsedBalance = Number.parseFloat(reportedBalance);

    try {
      await onSave({
        id: home.id,
        label,
        providerName,
        accountHint,
        reportedBalanceCents: Number.isFinite(parsedBalance)
          ? Math.max(0, Math.round(parsedBalance * 100))
          : null,
      });
      setStatus("saved");
      setMessage("Savings Home updated.");
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : "We couldn't update this Savings Home.");
    }
  };

  return (
    <form className="surface-card savings-home-editor" onSubmit={submit}>
      <header>
        <div>
          <span className="eyebrow">
            {home.connection_status === "connected" ? "Verified" : "Manual"}
          </span>
          <h3>{home.label}</h3>
        </div>
        <span className={`home-status-dot home-status-dot--${home.connection_status}`}>
          {home.connection_status === "connected" ? "Connected" : "1:1 home"}
        </span>
      </header>
      <div className="settings-form-grid">
        <label>
          <span>Nickname</span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            maxLength={64}
            required
          />
        </label>
        <label>
          <span>Bank or provider</span>
          <input
            value={providerName}
            onChange={(event) => setProviderName(event.target.value)}
            maxLength={80}
            placeholder="Optional"
          />
        </label>
        <label>
          <span>Last digits</span>
          <input
            value={accountHint}
            onChange={(event) => setAccountHint(event.target.value)}
            maxLength={24}
            placeholder="e.g. ••42"
          />
        </label>
        <label>
          <span>Reported balance</span>
          <span className="settings-money-input">
            <input
              type="number"
              min="0"
              step="1"
              inputMode="decimal"
              value={reportedBalance}
              onChange={(event) => setReportedBalance(event.target.value)}
              placeholder="0"
            />
            <small>kr</small>
          </span>
        </label>
      </div>
      <footer>
        <button
          className="button secondary compact-button"
          type="submit"
          disabled={status === "saving"}
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
        {message ? (
          <span
            className={`home-editor-message home-editor-message--${status}`}
            role={status === "error" ? "alert" : "status"}
          >
            {message}
          </span>
        ) : null}
      </footer>
    </form>
  );
}

export default SettingsPage;
