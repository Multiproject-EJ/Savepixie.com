import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AppShellOutletContext } from "../components/AppShell";

const STORAGE_KEY = "savepixie.weekly-plan.v1";

type WeeklyPlan = {
  available: number;
  committed: number;
  saving: number;
};

const defaultPlan: WeeklyPlan = { available: 180, committed: 83, saving: 35 };

function loadPlan(): WeeklyPlan {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...defaultPlan, ...(JSON.parse(stored) as Partial<WeeklyPlan>) }
      : defaultPlan;
  } catch {
    return defaultPlan;
  }
}

export function PlanPage() {
  const { basePath } = useOutletContext<AppShellOutletContext>();
  const [plan, setPlan] = useState<WeeklyPlan>(loadPlan);
  const safeToSpend = useMemo(
    () => Math.max(0, plan.available - plan.committed - plan.saving),
    [plan]
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  const update = (key: keyof WeeklyPlan, value: string) => {
    const next = Number.parseFloat(value);
    setPlan((current) => ({ ...current, [key]: Number.isFinite(next) ? Math.max(0, next) : 0 }));
  };

  return (
    <div className="app-page plan-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">A small plan, not accounting</span>
          <h1>This week</h1>
          <p>Three numbers are enough to make spending feel calmer.</p>
        </div>
        <span className="device-draft-badge">Saved on this device</span>
      </header>

      <section className="safe-to-spend-card">
        <span className="eyebrow">Safe to spend</span>
        <strong>£{safeToSpend.toFixed(0)}</strong>
        <p>after commitments and your goal contribution</p>
        <div className="plan-balance-bar" aria-hidden="true">
          <span
            className="plan-balance-bar__committed"
            style={{
              width: `${Math.min(100, (plan.committed / Math.max(1, plan.available)) * 100)}%`,
            }}
          />
          <span
            className="plan-balance-bar__saving"
            style={{
              width: `${Math.min(100, (plan.saving / Math.max(1, plan.available)) * 100)}%`,
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
            value={plan.available}
            onChange={(value) => update("available", value)}
            tone="violet"
          />
          <PlanField
            label="Committed"
            helper="Bills, travel and essentials"
            value={plan.committed}
            onChange={(value) => update("committed", value)}
            tone="gold"
          />
          <PlanField
            label="Saving"
            helper="Your planned goal contribution"
            value={plan.saving}
            onChange={(value) => update("saving", value)}
            tone="mint"
          />
        </div>
      </section>

      <section className="surface-card plan-note">
        <span className="plan-note__icon" aria-hidden="true">
          ✦
        </span>
        <div>
          <h2>{safeToSpend >= 0 ? "Your week has breathing room" : "Let's soften the plan"}</h2>
          <p>
            SavePixie keeps this intentionally simple. Categories and cloud sync come after this
            core weekly view is proven.
          </p>
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
        <span>£</span>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

export default PlanPage;
