import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import {
  currentWeekStart,
  fetchWeeklyPlan,
  saveWeeklyPlan,
  type WeeklyPlan,
} from "../features/plans/api";
import { formatMoney } from "../lib/format";

const STORAGE_KEY = "savepixie.weekly-plan.v1";

const weekStart = currentWeekStart();
const defaultPlan: WeeklyPlan = {
  weekStart,
  availableCents: 180000,
  committedCents: 83000,
  savingCents: 35000,
  updatedAt: null,
};

type SyncStatus = "loading" | "saved" | "unsaved" | "saving" | "error" | "preview";

function loadLegacyPlan(): WeeklyPlan | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const legacy = JSON.parse(stored) as Partial<{
      available: number;
      committed: number;
      saving: number;
    }>;
    return {
      ...defaultPlan,
      availableCents: Math.max(0, Math.round((legacy.available ?? 1800) * 100)),
      committedCents: Math.max(0, Math.round((legacy.committed ?? 830) * 100)),
      savingCents: Math.max(0, Math.round((legacy.saving ?? 350) * 100)),
    };
  } catch {
    return null;
  }
}

export function PlanPage() {
  const { basePath } = useOutletContext<AppShellOutletContext>();
  const { user } = useAuth();
  const isPreview = basePath === "/preview/app";
  const [plan, setPlan] = useState<WeeklyPlan>(defaultPlan);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isPreview ? "preview" : "loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const revision = useRef(0);
  const safeToSpend = useMemo(
    () => Math.max(0, plan.availableCents - plan.committedCents - plan.savingCents),
    [plan]
  );

  useEffect(() => {
    if (isPreview || !user?.id) return;

    let active = true;
    setSyncStatus("loading");
    setSyncError(null);

    void (async () => {
      try {
        const remotePlan = await fetchWeeklyPlan(user.id, weekStart);
        if (!active) return;

        if (remotePlan) {
          setPlan(remotePlan);
          setSyncStatus("saved");
          return;
        }

        const firstPlan = loadLegacyPlan() ?? defaultPlan;
        setPlan(firstPlan);
        setSyncStatus("saving");
        const saved = await saveWeeklyPlan(user.id, firstPlan);
        if (!active) return;
        setPlan(saved);
        setSyncStatus("saved");
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (cause) {
        if (!active) return;
        setSyncStatus("error");
        setSyncError(cause instanceof Error ? cause.message : "We couldn't load your weekly plan.");
      }
    })();

    return () => {
      active = false;
    };
  }, [isPreview, loadAttempt, user?.id]);

  useEffect(() => {
    if (isPreview || !user?.id || !dirty) return;

    const currentRevision = revision.current;
    const timer = window.setTimeout(() => {
      setSyncStatus("saving");
      setSyncError(null);
      void saveWeeklyPlan(user.id, plan)
        .then((saved) => {
          if (revision.current !== currentRevision) return;
          setPlan(saved);
          setDirty(false);
          setSyncStatus("saved");
          window.localStorage.removeItem(STORAGE_KEY);
        })
        .catch((cause) => {
          if (revision.current !== currentRevision) return;
          setSyncStatus("error");
          setSyncError(cause instanceof Error ? cause.message : "We couldn't sync your changes.");
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [dirty, isPreview, plan, saveAttempt, user?.id]);

  const retrySync = () => {
    setSyncError(null);
    if (dirty) {
      setSyncStatus("unsaved");
      setSaveAttempt((attempt) => attempt + 1);
      return;
    }

    setLoadAttempt((attempt) => attempt + 1);
  };

  const update = (key: "availableCents" | "committedCents" | "savingCents", value: string) => {
    const next = Number.parseFloat(value);
    revision.current += 1;
    setPlan((current) => ({
      ...current,
      [key]: Number.isFinite(next) ? Math.max(0, Math.round(next * 100)) : 0,
    }));
    setDirty(true);
    setSyncStatus(isPreview ? "preview" : "unsaved");
  };

  const syncLabel = {
    loading: "Loading your week…",
    saved: "Synced to your account",
    unsaved: "Saving shortly…",
    saving: "Saving…",
    error: "Not synced yet",
    preview: "Interactive preview",
  }[syncStatus];

  return (
    <div className="app-page plan-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">A small plan, not accounting</span>
          <h1>This week</h1>
          <p>Three numbers are enough to make spending feel calmer.</p>
        </div>
        <span className={`device-draft-badge sync-status sync-status--${syncStatus}`}>
          <span aria-hidden="true">{syncStatus === "saved" ? "✓" : "✦"}</span>
          {syncLabel}
        </span>
      </header>

      <section className="safe-to-spend-card">
        <span className="eyebrow">Safe to spend</span>
        <strong>{formatMoney(safeToSpend)}</strong>
        <p>after commitments and your goal contribution</p>
        <div className="plan-balance-bar" aria-hidden="true">
          <span
            className="plan-balance-bar__committed"
            style={{
              width: `${Math.min(100, (plan.committedCents / Math.max(1, plan.availableCents)) * 100)}%`,
            }}
          />
          <span
            className="plan-balance-bar__saving"
            style={{
              width: `${Math.min(100, (plan.savingCents / Math.max(1, plan.availableCents)) * 100)}%`,
            }}
          />
          <span className="plan-balance-bar__flex" />
        </div>
      </section>

      <section className="plan-editor surface-card">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Your simple split</span>
            <h2>Adjust the week</h2>
          </div>
        </header>
        <div className="plan-fields">
          <PlanField
            label="Available"
            helper="Money you can use this week"
            value={plan.availableCents}
            onChange={(value) => update("availableCents", value)}
            tone="violet"
          />
          <PlanField
            label="Committed"
            helper="Bills, travel and essentials"
            value={plan.committedCents}
            onChange={(value) => update("committedCents", value)}
            tone="gold"
          />
          <PlanField
            label="Saving"
            helper="Your planned goal contribution"
            value={plan.savingCents}
            onChange={(value) => update("savingCents", value)}
            tone="mint"
          />
        </div>
      </section>

      <section className="surface-card plan-note">
        <span className="plan-note__icon" aria-hidden="true">
          ✦
        </span>
        <div>
          <h2>Your week has breathing room</h2>
          <p>
            SavePixie keeps this intentionally simple. Your three numbers now follow your account,
            while categories and accounting stay out of the way.
          </p>
          {syncError ? (
            <div className="plan-sync-recovery" role="alert">
              <p className="plan-sync-error">{syncError}</p>
              <button className="button secondary compact-button" type="button" onClick={retrySync}>
                Try syncing again
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="account-check-invite">
        <div className="account-check-invite__icon" aria-hidden="true">
          <span>✦</span>
          <span>⌕</span>
        </div>
        <div>
          <span className="eyebrow">Experimental · 29 kr one-time</span>
          <h2>Could your savings have a better home?</h2>
          <p>
            Let Pixie Scout compare suitable account options and explain the trade-offs clearly.
          </p>
        </div>
        <Link className="button secondary" to={`${basePath}/plan/account-check`}>
          Preview Account Check
        </Link>
      </section>
    </div>
  );
}

function PlanField({
  label,
  helper,
  value,
  onChange,
  tone,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (value: string) => void;
  tone: string;
}) {
  return (
    <label className={`plan-field plan-field--${tone}`}>
      <span className="plan-field__dot" />
      <span className="plan-field__copy">
        <strong>{label}</strong>
        <small>{helper}</small>
      </span>
      <span className="plan-field__input">
        <span>kr</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={value / 100}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

export default PlanPage;
