import { FormEvent, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import { useSavings, type SavingsHomeInput } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import { createAccountExport, downloadAccountExport } from "../features/account/export";
import type { SavingsHome } from "../features/goals/types";

export function SettingsPage() {
  const { basePath } = useOutletContext<AppShellOutletContext>();
  const { user, signOut } = useAuth();
  const { displayName, profile, savingsHomes, updateHome } = useSavings();
  const navigate = useNavigate();
  const isPreview = basePath === "/preview/app";
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const exportData = async () => {
    if (!user?.id || isPreview) return;
    setExporting(true);
    setExportMessage(null);
    try {
      const data = await createAccountExport(user.id);
      downloadAccountExport(data);
      setExportMessage("Your private JSON export is ready.");
    } catch (cause) {
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
    await signOut();
    navigate("/");
  };

  const deletionSubject = encodeURIComponent("SavePixie account deletion request");
  const deletionBody = encodeURIComponent(
    `Please delete my SavePixie account${user?.email ? ` for ${user.email}` : ""}.`
  );

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
        <span className="settings-plan-pill">Basic · Free</span>
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
          {exportMessage ? <p className="settings-inline-message">{exportMessage}</p> : null}
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
          <h2>Sign out or request deletion</h2>
          <p>
            Deletion removes the SavePixie account and saving records. It never affects money held
            at your bank.
          </p>
        </div>
        <div className="settings-account-actions__buttons">
          <button className="button secondary" type="button" onClick={handleSignOut}>
            {isPreview ? "Leave preview" : "Sign out"}
          </button>
          <a
            className="button danger-button"
            href={`mailto:support@savepixie.com?subject=${deletionSubject}&body=${deletionBody}`}
          >
            Request account deletion
          </a>
        </div>
        <small>
          Self-service deletion is still a launch blocker; this request route remains available in
          the meantime.
        </small>
      </section>
    </div>
  );
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
          <span className={`home-editor-message home-editor-message--${status}`}>{message}</span>
        ) : null}
      </footer>
    </form>
  );
}

export default SettingsPage;
