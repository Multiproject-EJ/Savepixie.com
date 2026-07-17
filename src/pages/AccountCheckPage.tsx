import { FormEvent, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { AppShellOutletContext } from "../components/AppShell";
import PixieMark from "../components/PixieMark";
import {
  compareSampleAccounts,
  type AccountAccess,
  type AccountCheckCriteria,
  type AccountCheckResult,
  type AccountRegion,
} from "../data/accountCheck";

const STORAGE_KEY = "savepixie.account-check.preview.v1";
const DAY_MS = 86_400_000;

type StoredReport = {
  createdAt: string;
  freshUntil: string;
  deleteAt: string;
  criteria: AccountCheckCriteria;
  results: AccountCheckResult[];
};

const defaultCriteria: AccountCheckCriteria = {
  amountNok: 50_000,
  access: "instant",
  region: "east",
  age: 28,
  requireVerification: true,
};

function loadStoredReport(): StoredReport | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StoredReport;
    if (new Date(parsed.deleteAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function createStoredReport(
  criteria: AccountCheckCriteria,
  results: AccountCheckResult[]
): StoredReport {
  const now = Date.now();
  return {
    createdAt: new Date(now).toISOString(),
    freshUntil: new Date(now + 7 * DAY_MS).toISOString(),
    deleteAt: new Date(now + 90 * DAY_MS).toISOString(),
    criteria,
    results,
  };
}

function formatNok(value: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AccountCheckPage() {
  const { basePath } = useOutletContext<AppShellOutletContext>();
  const [criteria, setCriteria] = useState<AccountCheckCriteria>(() => {
    return loadStoredReport()?.criteria ?? defaultCriteria;
  });
  const [report, setReport] = useState<StoredReport | null>(loadStoredReport);
  const [scanning, setScanning] = useState(false);

  const isFresh = report ? new Date(report.freshUntil).getTime() > Date.now() : false;
  const daysUntilDeletion = useMemo(() => {
    if (!report) return 0;
    return Math.max(0, Math.ceil((new Date(report.deleteAt).getTime() - Date.now()) / DAY_MS));
  }, [report]);

  const update = <Key extends keyof AccountCheckCriteria>(
    key: Key,
    value: AccountCheckCriteria[Key]
  ) => setCriteria((current) => ({ ...current, [key]: value }));

  const runCheck = (event: FormEvent) => {
    event.preventDefault();
    setScanning(true);
    window.setTimeout(() => {
      const results = compareSampleAccounts(criteria);
      const nextReport = createStoredReport(criteria, results);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextReport));
      setReport(nextReport);
      setScanning(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 900);
  };

  const deleteReport = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setReport(null);
  };

  return (
    <div className="app-page account-check-page">
      <header className="account-check-heading">
        <Link className="account-check-back" to={`${basePath}/plan`}>
          <span aria-hidden="true">←</span> Plan
        </Link>
        <span className="account-check-price">29 kr · one-time check</span>
      </header>

      <section className="account-check-hero">
        <div className="account-check-hero__copy">
          <span className="eyebrow">Experimental · Pixie Scout</span>
          <h1>Could your savings have a better home?</h1>
          <p>
            Tell us what matters. Pixie Scout compares suitable options and explains the trade-offs
            without hiding providers that do not pay us.
          </p>
          <div className="account-check-trust-row">
            <span>One transparent check</span>
            <span>No bank login needed</span>
            <span>Auto-deletes after 90 days</span>
          </div>
        </div>
        <div className={`account-check-scout${scanning ? " scanning" : ""}`}>
          <span className="account-check-scout__orbit" aria-hidden="true" />
          <PixieMark size="large" mood={scanning ? "curious" : "happy"} />
          <strong>{scanning ? "Checking every eligible option…" : "Ready to scout"}</strong>
        </div>
      </section>

      <p className="account-check-sample-note" role="note">
        <strong>Prototype:</strong> this screen uses fictional banks and example rates. No payment
        is taken and no real financial recommendation is produced.
      </p>

      <div className="account-check-layout">
        <form className="surface-card account-check-form" onSubmit={runCheck}>
          <header className="section-heading">
            <div>
              <span className="eyebrow">Your preferences</span>
              <h2>What should Scout look for?</h2>
            </div>
          </header>

          <label className="account-check-field">
            <span>
              <strong>Amount to compare</strong>
              <small>An estimate is enough</small>
            </span>
            <span className="account-check-money-input">
              <input
                type="number"
                min="1000"
                step="1000"
                inputMode="numeric"
                value={criteria.amountNok}
                onChange={(event) => update("amountNok", Math.max(0, Number(event.target.value)))}
              />
              <b>kr</b>
            </span>
          </label>

          <label className="account-check-field">
            <span>
              <strong>Access to the money</strong>
              <small>How flexible should it be?</small>
            </span>
            <select
              value={criteria.access}
              onChange={(event) => update("access", event.target.value as AccountAccess)}
            >
              <option value="instant">Any time</option>
              <option value="notice">Notice period is fine</option>
              <option value="fixed">A short fixed period is fine</option>
            </select>
          </label>

          <label className="account-check-field">
            <span>
              <strong>Availability</strong>
              <small>Only used to check eligibility</small>
            </span>
            <select
              value={criteria.region}
              onChange={(event) => update("region", event.target.value as AccountRegion)}
            >
              <option value="nationwide">Nationwide only</option>
              <option value="east">Eastern Norway</option>
              <option value="west">Western Norway</option>
              <option value="north">Northern Norway</option>
            </select>
          </label>

          <label className="account-check-field">
            <span>
              <strong>Your age</strong>
              <small>Some accounts have age limits</small>
            </span>
            <input
              type="number"
              min="18"
              max="100"
              value={criteria.age}
              onChange={(event) => update("age", Number(event.target.value))}
            />
          </label>

          <label className="account-check-toggle">
            <input
              type="checkbox"
              checked={criteria.requireVerification}
              onChange={(event) => update("requireVerification", event.target.checked)}
            />
            <span>
              <strong>Require SavePixie verification compatibility</strong>
              <small>Only show accounts that could support the 1:1 Savings Home.</small>
            </span>
          </label>

          <button className="button primary" type="submit" disabled={scanning}>
            {scanning ? "Scout is checking…" : "Preview my 29 kr check"}
          </button>
          <small className="account-check-form__legal">
            Production results will be a comparison, not personalised financial advice.
          </small>
        </form>

        <section className="surface-card account-check-results" aria-live="polite">
          <header className="section-heading">
            <div>
              <span className="eyebrow">Your report</span>
              <h2>{report ? "Scout found these matches" : "Your matches will appear here"}</h2>
            </div>
            {report ? (
              <button type="button" onClick={deleteReport}>
                Delete now
              </button>
            ) : null}
          </header>

          {!report ? (
            <div className="account-check-empty">
              <span aria-hidden="true">✦</span>
              <p>Adjust four simple preferences, then run the sample check.</p>
            </div>
          ) : report.results.length ? (
            <>
              <div className="account-check-report-meta">
                <span className={isFresh ? "fresh" : "expired"}>
                  {isFresh ? "Sample report is fresh" : "Sample report has expired"}
                </span>
                <small>Deletes automatically in {daysUntilDeletion} days</small>
              </div>
              <div className="account-match-list">
                {report.results.slice(0, 3).map((result, index) => (
                  <article
                    className={`account-match-card${index === 0 ? " best" : ""}`}
                    key={result.id}
                  >
                    <div className="account-match-card__rank">
                      <span>{index === 0 ? "Best fit" : `Option ${index + 1}`}</span>
                      <strong>{result.ratePercent.toFixed(2)}%</strong>
                    </div>
                    <h3>{result.productName}</h3>
                    <p>{result.provider}</p>
                    <div className="account-match-card__interest">
                      <span>Example yearly interest</span>
                      <strong>{formatNok(result.estimatedInterestNok)}</strong>
                    </div>
                    <ul>
                      {result.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
              <p className="account-check-source-note">
                Production reports will show source, update time, methodology and every eligible
                result—not pay-to-rank placements.
              </p>
            </>
          ) : (
            <div className="account-check-empty">
              <span aria-hidden="true">◇</span>
              <p>No sample accounts matched. Try allowing a longer withdrawal period.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AccountCheckPage;
