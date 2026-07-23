import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import { useSavings } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import InviteLinkCard from "../components/InviteLinkCard";
import {
  archivePact,
  fetchOwnPactEntries,
  fetchOwnPactMembership,
  fetchPactActivity,
  fetchPactActivityCheers,
  fetchPactMembers,
  leavePact,
  togglePactActivityCheer,
  updatePactMembership,
} from "../features/goals/api";
import { nextPactMilestone, pactMilestones, weeklyPactPace } from "../features/goals/progress";
import type {
  PactEntry,
  PactActivity,
  PactMemberSummary,
  PactMembership,
  PactPrivacyMode,
} from "../features/goals/types";
import { gentleHaptic } from "../lib/feedback";
import { currencySymbol } from "../lib/currency";
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
  const [entries, setEntries] = useState<PactEntry[]>([]);
  const [activity, setActivity] = useState<PactActivity[]>([]);
  const [activityCheers, setActivityCheers] = useState<
    Record<string, { count: number; cheered: boolean }>
  >({});
  const [cheeringId, setCheeringId] = useState<string | null>(null);
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
      setEntries([
        {
          id: "preview-entry-1",
          pact_id: goal.id,
          member_user_id: currentUserId,
          entry_type: "pending",
          delta_cents: 5000,
          verification_state: "reported",
          note: "Skipped a takeaway and saved the difference.",
          created_at: new Date().toISOString(),
        },
      ]);
      setActivity([
        {
          activity_id: "preview-activity-1",
          actor_user_id: "preview-friend",
          actor_display_name: "Alex",
          activity_kind: "save",
          amount_cents: null,
          amount_visible: false,
          occurred_at: new Date().toISOString(),
        },
        {
          activity_id: "preview-activity-2",
          actor_user_id: currentUserId,
          actor_display_name: displayName,
          activity_kind: "save",
          amount_cents: 5000,
          amount_visible: true,
          occurred_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
      ]);
      setActivityCheers({
        "preview-activity-1": { count: 2, cheered: false },
        "preview-activity-2": { count: 1, cheered: false },
      });
      setCommitment("6000");
      setPrivacyMode("on_track_only");
      setLoading(false);
      return;
    }

    try {
      const [nextMembers, ownMembership, ownEntries, nextActivity, nextCheers] = await Promise.all([
        fetchPactMembers(goal.id),
        fetchOwnPactMembership(goal.id, currentUserId),
        fetchOwnPactEntries(goal.id, currentUserId),
        goal.mode === "shared" ? fetchPactActivity(goal.id) : Promise.resolve([]),
        goal.mode === "shared" ? fetchPactActivityCheers(goal.id) : Promise.resolve([]),
      ]);
      setMembers(nextMembers);
      setMembership(ownMembership);
      setEntries(ownEntries);
      setActivity(nextActivity);
      setActivityCheers(
        Object.fromEntries(
          nextCheers.map((cheer) => [
            cheer.activity_id,
            { count: cheer.cheer_count, cheered: cheer.cheered_by_me },
          ])
        )
      );
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
  const milestones = goal ? pactMilestones(goal) : [];
  const nextMilestone = goal ? nextPactMilestone(goal) : null;
  const weeklyPace = goal ? weeklyPactPace(goal) : null;
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
      setNotice("A private seven-day invitation is ready.");
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

  const cheerActivity = async (activityId: string) => {
    if (cheeringId) return;
    setCheeringId(activityId);
    setError(null);
    try {
      const previous = activityCheers[activityId] ?? { count: 0, cheered: false };
      const cheered = isPreview ? !previous.cheered : await togglePactActivityCheer(activityId);
      setActivityCheers((current) => ({
        ...current,
        [activityId]: {
          cheered,
          count: Math.max(0, previous.count + (cheered ? 1 : -1)),
        },
      }));
      gentleHaptic();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't send that cheer.");
    } finally {
      setCheeringId(null);
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
          <strong>{formatMoney(goal.saved_cents, goal.currency_code)}</strong>
          <p>
            of {formatMoney(goal.target_cents, goal.currency_code)} · {progress}% reported
          </p>
          <div className="progress-track" aria-label={`${progress}% reported`}>
            <span style={{ width: `${progress}%`, background: goal.color || "#7b3fff" }} />
          </div>
        </div>
        <dl className="pact-detail-stats">
          <div>
            <dt>Verified</dt>
            <dd>{formatMoney(goal.verified_cents, goal.currency_code)}</dd>
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
        {inviteUrl ? (
          <InviteLinkCard
            className="pact-detail-invite"
            url={inviteUrl}
            onDismiss={() => setInviteUrl(null)}
          />
        ) : null}
      </section>

      <section className="surface-card pact-momentum-section">
        <header className="section-heading">
          <div>
            <span className="eyebrow">A path you can believe</span>
            <h2>Your next visible win</h2>
          </div>
          {weeklyPace !== null ? (
            <span className="pact-pace-pill">
              {weeklyPace > 0
                ? `${formatMoney(weeklyPace, goal.currency_code)} / week`
                : "Target reached"}
            </span>
          ) : null}
        </header>
        <p className="support-copy">
          {nextMilestone
            ? `${formatMoney(Math.max(0, nextMilestone.targetCents - goal.saved_cents), goal.currency_code)} until the ${nextMilestone.percent}% milestone.`
            : "Every milestone is complete. This Pact has reached its target."}
          {weeklyPace !== null && weeklyPace > 0
            ? ` A flexible pace of about ${formatMoney(weeklyPace, goal.currency_code)} each week reaches the current dream date.`
            : " Add a dream date whenever a weekly guide would feel useful."}
        </p>
        <div className="pact-milestone-row" aria-label="Pact milestones">
          {milestones.map((milestone) => (
            <div className={milestone.reached ? "reached" : ""} key={milestone.percent}>
              <span>{milestone.reached ? "✓" : milestone.percent}</span>
              <small>{milestone.percent}%</small>
              <em>{formatMoney(milestone.targetCents, goal.currency_code)}</em>
            </div>
          ))}
        </div>
      </section>

      {goal.mode === "shared" ? (
        <>
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
                  <MemberProgress member={member} currencyCode={goal.currency_code} />
                </article>
              ))}
            </div>
          </section>

          <section className="surface-card pact-activity-section">
            <header className="section-heading">
              <div>
                <span className="eyebrow">A Circle that notices effort</span>
                <h2>Recent momentum</h2>
                <p>
                  Participation is shared; exact amounts still follow each member&apos;s privacy
                  choice.
                </p>
              </div>
            </header>
            {activity.length ? (
              <ol>
                {activity.map((item) => (
                  <li key={item.activity_id}>
                    <span className="profile-avatar">
                      {item.actor_display_name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>
                        {item.actor_user_id === currentUserId ? "You" : item.actor_display_name}{" "}
                        {activityPhrase(item.activity_kind)}
                      </strong>
                      <small>{relativeActivityDate(item.occurred_at)}</small>
                    </div>
                    <span className="pact-activity-section__amount">
                      {item.amount_visible && item.amount_cents !== null
                        ? formatMoney(item.amount_cents, goal.currency_code)
                        : "Amount private"}
                    </span>
                    {item.actor_user_id !== currentUserId ? (
                      <button
                        className={
                          activityCheers[item.activity_id]?.cheered
                            ? "pact-cheer-button cheered"
                            : "pact-cheer-button"
                        }
                        type="button"
                        aria-pressed={activityCheers[item.activity_id]?.cheered ?? false}
                        aria-label={`Cheer ${item.actor_display_name}'s saving move`}
                        disabled={cheeringId === item.activity_id}
                        onClick={() => void cheerActivity(item.activity_id)}
                      >
                        <span aria-hidden="true">✦</span>
                        Cheer
                        {(activityCheers[item.activity_id]?.count ?? 0) > 0
                          ? ` ${activityCheers[item.activity_id].count}`
                          : ""}
                      </button>
                    ) : (
                      <span className="pact-cheer-count">
                        {(activityCheers[item.activity_id]?.count ?? 0) > 0
                          ? `${activityCheers[item.activity_id].count} cheers`
                          : "Your Move"}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="support-copy">The first Circle save will light up this space.</p>
            )}
          </section>
        </>
      ) : null}

      <section className="surface-card pact-entry-history">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Your private contribution history</span>
            <h2>The small saves that built this</h2>
            <p>Only your own exact entries appear here.</p>
          </div>
        </header>
        {entries.length ? (
          <ol>
            {entries.map((entry) => (
              <li key={entry.id}>
                <span className={`pact-entry-history__state ${entry.verification_state}`}>
                  {entry.verification_state === "verified" ? "✓" : "✦"}
                </span>
                <div>
                  <strong>{entryLabel(entry.entry_type)}</strong>
                  <small>
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(entry.created_at))}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </small>
                </div>
                <span className={entry.delta_cents < 0 ? "negative" : ""}>
                  {entry.delta_cents > 0 ? "+" : ""}
                  {formatMoney(entry.delta_cents, goal.currency_code)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="pact-entry-history__empty">
            <span aria-hidden="true">✦</span>
            <p>Your first pending save will make this story visible.</p>
            <button
              className="button secondary"
              type="button"
              onClick={() => openQuickSave(goal.id)}
            >
              Add the first save
            </button>
          </div>
        )}
      </section>

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
              <strong>{currencySymbol(goal.currency_code)}</strong>
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

function MemberProgress({
  member,
  currencyCode,
}: {
  member: PactMemberSummary;
  currencyCode: string;
}) {
  if (member.amount_visible) {
    return (
      <span className="member-progress member-progress--exact">
        <strong>{formatMoney(member.reported_cents ?? 0, currencyCode)}</strong>
        <small>
          {member.commitment_cents === null
            ? "No commitment set"
            : `of ${formatMoney(member.commitment_cents, currencyCode)}`}
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

function entryLabel(entryType: PactEntry["entry_type"]) {
  switch (entryType) {
    case "allocation":
      return "Bank-verified allocation";
    case "withdrawal":
      return "Pact withdrawal";
    case "reversal":
      return "Reversed entry";
    case "commitment":
      return "Commitment recorded";
    default:
      return "Pending save";
  }
}

function activityPhrase(kind: PactActivity["activity_kind"]) {
  if (kind === "verified_save") return "verified a real bank save";
  if (kind === "adjustment") return "kept the Pact honest with an adjustment";
  return "made a saving move";
}

function relativeActivityDate(value: string) {
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export default PactDetailPage;
