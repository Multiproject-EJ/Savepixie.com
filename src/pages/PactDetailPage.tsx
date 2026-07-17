import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import { useSavings } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import {
  archivePact,
  fetchOwnPactMembership,
  fetchPactMembers,
  leavePact,
  updatePactMembership,
} from "../features/goals/api";
import type { PactMemberSummary, PactMembership, PactPrivacyMode } from "../features/goals/types";
import { formatMoney, formatShortDate, goalProgress } from "../lib/format";
import { useModalDialog } from "../lib/useModalDialog";

const privacyOptions: Array<{
  value: PactPrivacyMode;
  label: string;
  helper: string;
}> = [
  {
    value: "on_track_only",
    label: "Show only on-track status",
    helper: "Recommended: the Circle sees momentum, not your exact amount.",
  },
  {
    value: "exact",
    label: "Show my exact Pact amount",
    helper: "Every active member can see what you have reported to this Pact.",
  },
  {
    value: "organizer_only",
    label: "Exact amount for organiser only",
    helper: "Other members see neither the amount nor an on-track status.",
  },
];

export function PactDetailPage() {
  const { pactId = "" } = useParams();
  const { basePath, openQuickSave } = useOutletContext<AppShellOutletContext>();
  const { user } = useAuth();
  const { goals, loading: goalsLoading, displayName, refresh, createInvite } = useSavings();
  const navigate = useNavigate();
  const goal = goals.find((item) => item.id === pactId);
  const isPreview = basePath === "/preview/app";
  const currentUserId = user?.id ?? (isPreview ? "preview-user" : null);
  const [members, setMembers] = useState<PactMemberSummary[]>([]);
  const [membership, setMembership] = useState<PactMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commitment, setCommitment] = useState("");
  const [privacyMode, setPrivacyMode] = useState<PactPrivacyMode>("on_track_only");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"leave" | "archive" | null>(null);
  const [acting, setActing] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const confirmDialogRef = useModalDialog<HTMLElement>(
    confirmAction !== null,
    () => setConfirmAction(null),
    !acting
  );

  const loadMembers = async () => {
    if (!goal || !currentUserId) return;
    setLoading(true);
    setError(null);

    if (isPreview) {
      const previewMembership: PactMembership = {
        pact_id: goal.id,
        user_id: currentUserId,
        role: "owner",
        display_name: displayName,
        commitment_cents: 600000,
        privacy_mode: "on_track_only",
        status: "active",
        joined_at: goal.created_at,
        left_at: null,
      };
      setMembership(previewMembership);
      setMembers([
        {
          ...previewMembership,
          reported_cents: 260000,
          verified_cents: 0,
          amount_visible: true,
          on_track: false,
        },
        {
          pact_id: goal.id,
          user_id: "preview-friend",
          role: "member",
          display_name: "Alex",
          commitment_cents: null,
          privacy_mode: "on_track_only",
          status: "active",
          joined_at: goal.created_at,
          left_at: null,
          reported_cents: null,
          verified_cents: null,
          amount_visible: false,
          on_track: true,
        },
      ]);
      setCommitment("6000");
      setPrivacyMode("on_track_only");
      setLoading(false);
      return;
    }

    try {
      const [nextMembers, ownMembership] = await Promise.all([
        fetchPactMembers(goal.id),
        fetchOwnPactMembership(goal.id, currentUserId),
      ]);
      setMembers(nextMembers);
      setMembership(ownMembership);
      setCommitment(
        ownMembership.commitment_cents === null ? "" : String(ownMembership.commitment_cents / 100)
      );
      setPrivacyMode(ownMembership.privacy_mode);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't open this Pact.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
    // loadMembers intentionally follows the selected Pact and signed-in identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id, currentUserId, isPreview]);

  const progress = goal ? goalProgress(goal.saved_cents, goal.target_cents) : 0;
  const isOwner = membership?.role === "owner";
  const selectedPrivacy = useMemo(
    () => privacyOptions.find((option) => option.value === privacyMode),
    [privacyMode]
  );

  if (goalsLoading || (goal && loading && !membership)) {
    return (
      <div className="app-page pact-detail-page">
        <div className="skeleton-card" />
        <div className="skeleton-block" />
      </div>
    );
  }

  if (!goal) {
    return (
      <section className="app-page empty-state compact">
        <span className="empty-state__seed">◎</span>
        <h1>This Pact is no longer active</h1>
        <p>It may have been archived, or your membership may have ended.</p>
        <Link className="button primary" to={`${basePath}/goals`}>
          Back to Pacts
        </Link>
      </section>
    );
  }

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserId || !membership) return;
    const parsed = Number.parseFloat(commitment);
    const commitmentCents = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : null;
    setSavingPreferences(true);
    setError(null);
    setNotice(null);
    try {
      if (isPreview) {
        setMembership({
          ...membership,
          commitment_cents: commitmentCents,
          privacy_mode: privacyMode,
        });
      } else {
        const updated = await updatePactMembership({
          pactId: goal.id,
          userId: currentUserId,
          commitmentCents,
          privacyMode: goal.mode === "solo" ? "private" : privacyMode,
        });
        setMembership(updated);
        await loadMembers();
      }
      setNotice("Your commitment and privacy choice are saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save your Pact preferences.");
    } finally {
      setSavingPreferences(false);
    }
  };

  const createPrivateInvite = async () => {
    try {
      const token = isPreview ? "preview-invite" : await createInvite(goal.id);
      const url = `${window.location.origin}/app?join=${token}`;
      setInviteUrl(url);
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(url).catch(() => undefined);
      setNotice("A private seven-day invitation is ready and copied.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't create an invitation.");
    }
  };

  const finishMembership = async () => {
    if (!confirmAction) return;
    setActing(true);
    setError(null);
    try {
      if (!isPreview) {
        if (confirmAction === "archive") await archivePact(goal.id);
        else await leavePact(goal.id);
        await refresh();
      }
      navigate(`${basePath}/goals`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't update this Pact.");
      setConfirmAction(null);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="app-page pact-detail-page">
      <header className="page-heading pact-detail-heading">
        <div>
          <Link className="eyebrow pact-back-link" to={`${basePath}/goals`}>
            ← Your Pacts
          </Link>
          <h1>{goal.name}</h1>
          <p>
            {goal.mode === "shared"
              ? "A shared promise, with every person's money staying in their own Savings Home."
              : "A private promise to future you, backed by your own Savings Home."}
          </p>
        </div>
        <span className={`pact-mode-pill ${goal.mode}`}>
          {goal.mode === "shared" ? "◎ Shared Pact" : "✦ Solo Pact"}
        </span>
      </header>

      {error ? <p className="alert error">{error}</p> : null}
      {notice ? <p className="alert success">{notice}</p> : null}

      <section className="pact-detail-hero">
        <div className="pact-detail-hero__icon" style={{ background: `${goal.color}22` }}>
          {goal.emoji}
        </div>
        <div className="pact-detail-hero__progress">
          <span className="eyebrow">Circle progress</span>
          <strong>{formatMoney(goal.saved_cents)}</strong>
          <p>
            of {formatMoney(goal.target_cents)} · {progress}% reported
          </p>
          <div className="progress-track" aria-label={`${progress}% reported`}>
            <span style={{ width: `${progress}%`, background: goal.color || "#7b3fff" }} />
          </div>
        </div>
        <dl className="pact-detail-stats">
          <div>
            <dt>Verified</dt>
            <dd>{formatMoney(goal.verified_cents)}</dd>
          </div>
          <div>
            <dt>Dream date</dt>
            <dd>{formatShortDate(goal.deadline_date)}</dd>
          </div>
          <div>
            <dt>People</dt>
            <dd>{members.length}</dd>
          </div>
        </dl>
        <div className="pact-detail-hero__actions">
          <button className="button primary" type="button" onClick={() => openQuickSave(goal.id)}>
            Add a pending save
          </button>
          {goal.mode === "shared" && isOwner ? (
            <button className="button secondary" type="button" onClick={createPrivateInvite}>
              Invite someone
            </button>
          ) : null}
        </div>
        {inviteUrl ? <small className="pact-detail-invite">{inviteUrl}</small> : null}
      </section>

      {goal.mode === "shared" ? (
        <section className="surface-card pact-circle-section">
          <header className="section-heading">
            <div>
              <span className="eyebrow">Privacy-respecting progress</span>
              <h2>Your Circle</h2>
              <p>Hidden amounts stay hidden. SavePixie shows only what each person chose.</p>
            </div>
          </header>
          <div className="pact-member-grid">
            {members.map((member) => (
              <article className="pact-member-card" key={member.user_id}>
                <span className="profile-avatar">
                  {member.display_name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>
                    {member.display_name}
                    {member.user_id === currentUserId ? " · You" : ""}
                  </strong>
                  <small>{member.role === "owner" ? "Organiser" : "Circle member"}</small>
                </div>
                <MemberProgress member={member} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="pact-preferences-layout">
        <form className="surface-card pact-preferences" onSubmit={savePreferences}>
          <header>
            <span className="eyebrow">Your part of the Pact</span>
            <h2>Commitment &amp; privacy</h2>
            <p>A commitment motivates the plan; it never moves or locks money.</p>
          </header>
          <label className="form-control">
            <span>My commitment</span>
            <span className="amount-input">
              <strong>kr</strong>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={commitment}
                onChange={(event) => setCommitment(event.target.value)}
                placeholder="Optional"
              />
            </span>
          </label>
          {goal.mode === "shared" ? (
            <label className="form-control">
              <span>What the Circle can see</span>
              <select
                value={privacyMode}
                onChange={(event) => setPrivacyMode(event.target.value as PactPrivacyMode)}
              >
                {privacyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <small>{selectedPrivacy?.helper}</small>
            </label>
          ) : (
            <div className="pact-private-note">
              <span aria-hidden="true">◆</span>
              <p>Solo Pact amounts are private to your account.</p>
            </div>
          )}
          <button className="button secondary" type="submit" disabled={savingPreferences}>
            {savingPreferences ? "Saving…" : "Save my Pact settings"}
          </button>
        </form>

        <aside className="surface-card pact-safety-card">
          <span aria-hidden="true">⌂</span>
          <div>
            <span className="eyebrow">The 1:1 promise</span>
            <h2>Your money is not pooled</h2>
            <p>
              Each member saves in their own bank account. Shared progress is an agreement and a
              privacy-filtered view—not a shared SavePixie balance.
            </p>
          </div>
        </aside>
      </section>

      <section className="surface-card pact-danger-zone">
        <div>
          <span className="eyebrow">Pact control</span>
          <h2>{isOwner ? "Archive this Pact" : "Leave this Pact"}</h2>
          <p>
            {isOwner
              ? "Archiving stops new activity and removes it from active dashboards. History remains intact."
              : "Leaving removes your access but preserves the Circle's history. Your bank money is untouched."}
          </p>
        </div>
        <button
          className="button danger-button"
          type="button"
          onClick={() => setConfirmAction(isOwner ? "archive" : "leave")}
        >
          {isOwner ? "Archive Pact" : "Leave Pact"}
        </button>
      </section>

      {confirmAction ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => !acting && setConfirmAction(null)}
        >
          <section
            ref={confirmDialogRef}
            className="pixie-modal pact-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pact-confirm-title"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">Please check</span>
            <h2 id="pact-confirm-title">
              {confirmAction === "archive" ? "Archive this Pact?" : "Leave this Pact?"}
            </h2>
            <p>
              The ledger stays intact and no money moves. This changes only access and active Pact
              status inside SavePixie.
            </p>
            <div className="pact-confirm-modal__actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={acting}
              >
                Keep Pact
              </button>
              <button
                className="button danger-button"
                type="button"
                onClick={finishMembership}
                disabled={acting}
              >
                {acting ? "Working…" : confirmAction === "archive" ? "Yes, archive" : "Yes, leave"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function MemberProgress({ member }: { member: PactMemberSummary }) {
  if (member.amount_visible) {
    return (
      <span className="member-progress member-progress--exact">
        <strong>{formatMoney(member.reported_cents ?? 0)}</strong>
        <small>
          {member.commitment_cents === null
            ? "No commitment set"
            : `of ${formatMoney(member.commitment_cents)}`}
        </small>
      </span>
    );
  }

  if (member.on_track !== null) {
    return (
      <span className={`member-progress ${member.on_track ? "member-progress--on" : ""}`}>
        <strong>{member.on_track ? "On track" : "Building momentum"}</strong>
        <small>Exact amount private</small>
      </span>
    );
  }

  return (
    <span className="member-progress">
      <strong>Private</strong>
      <small>Amount and status hidden</small>
    </span>
  );
}

export default PactDetailPage;
