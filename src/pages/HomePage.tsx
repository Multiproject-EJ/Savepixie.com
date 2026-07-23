import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import InstallPwaButton from "../components/InstallPwaButton";
import PixieMark from "../components/PixieMark";
import { joinWaitlist, type WaitlistDream } from "../features/waitlist/api";
import { getPreferredCurrency, starterAmountFromNok } from "../lib/currency";
import { formatMoney } from "../lib/format";

const dreamChoices: Array<{ key: WaitlistDream; emoji: string; label: string }> = [
  { key: "travel", emoji: "✈️", label: "A big trip" },
  { key: "safety", emoji: "☁️", label: "A safety buffer" },
  { key: "home", emoji: "🏡", label: "A future home" },
  { key: "something", emoji: "✨", label: "Something special" },
];

function HomePage() {
  const [searchParams] = useSearchParams();
  const accountDeleted = searchParams.get("account") === "deleted";
  const [email, setEmail] = useState("");
  const [dream, setDream] = useState<WaitlistDream | null>(null);
  const [consented, setConsented] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [waitlistOpen, setWaitlistOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#join-waitlist"
  );
  const waitlistDialogRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const landingCurrency = useMemo(() => getPreferredCurrency(), []);
  const sampleSaved = starterAmountFromNok(4200, landingCurrency) * 100;
  const sampleTarget = starterAmountFromNok(12000, landingCurrency) * 100;
  const sampleMove = starterAmountFromNok(50, landingCurrency) * 100;
  const attribution = useMemo(
    () => ({
      source: searchParams.get("utm_source") ?? "savepixie-landing",
      medium: searchParams.get("utm_medium"),
      campaign: searchParams.get("utm_campaign"),
    }),
    [searchParams]
  );

  const closeWaitlist = useCallback(() => {
    setWaitlistOpen(false);
    if (typeof window !== "undefined" && window.location.hash === "#join-waitlist") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    const syncWaitlistWithHash = () => {
      setWaitlistOpen(window.location.hash === "#join-waitlist");
    };

    syncWaitlistWithHash();
    window.addEventListener("hashchange", syncWaitlistWithHash);
    return () => window.removeEventListener("hashchange", syncWaitlistWithHash);
  }, []);

  useEffect(() => {
    if (!waitlistOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      if (status === "success") {
        waitlistDialogRef.current
          ?.querySelector<HTMLButtonElement>(".waitlist-dialog__close")
          ?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 30);

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeWaitlist();
        return;
      }

      if (event.key !== "Tab" || !waitlistDialogRef.current) return;

      const focusable = Array.from(
        waitlistDialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [closeWaitlist, status, waitlistOpen]);

  const submitWaitlist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consented || status === "submitting") return;

    setStatus("submitting");
    setMessage(null);

    try {
      await joinWaitlist({
        email,
        dream,
        honeypot,
        ...attribution,
      });
      setStatus("success");
      setMessage("You’re in. We’ll tell you when the Pixie is ready.");
    } catch (cause) {
      setStatus("error");
      setMessage(
        cause instanceof Error
          ? cause.message
          : "We couldn’t save your spot just now. Please try again."
      );
    }
  };

  return (
    <div className="landing-page">
      {accountDeleted ? (
        <div className="landing-status-banner" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>Your SavePixie account has been deleted.</strong>
            <small>Your real bank account and savings were never changed.</small>
          </div>
        </div>
      ) : null}
      {waitlistOpen ? (
        <div
          className="waitlist-dialog__backdrop"
          id="join-waitlist"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeWaitlist();
          }}
        >
          <div
            className="waitlist-dialog"
            ref={waitlistDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="waitlist-dialog-title"
            aria-describedby="waitlist-dialog-description"
          >
            <button
              className="waitlist-dialog__close"
              type="button"
              onClick={closeWaitlist}
              aria-label="Close waitlist"
            >
              ×
            </button>
            <header className="waitlist-dialog__header">
              <span className="waitlist-dialog__pixie" aria-hidden="true">
                <PixieMark size="medium" mood="happy" />
                <i>✦</i>
                <i>✧</i>
              </span>
              <span className="eyebrow">Save my early spot</span>
              <h2 id="waitlist-dialog-title">Give your dream a real starting point.</h2>
              <p id="waitlist-dialog-description">
                Join the SavePixie early list. Tell us what you want to grow, and we’ll let you know
                when your Pixie is ready.
              </p>
            </header>
            <form className="waitlist-form" onSubmit={submitWaitlist}>
              {status === "success" ? (
                <div className="waitlist-success" role="status">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>{message}</strong>
                    <small>No card. No spam. Just meaningful launch updates.</small>
                  </div>
                </div>
              ) : (
                <>
                  <fieldset className="waitlist-dreams">
                    <legend>What should your small wins grow into?</legend>
                    <div>
                      {dreamChoices.map((choice) => (
                        <button
                          className={dream === choice.key ? "selected" : ""}
                          key={choice.key}
                          type="button"
                          aria-pressed={dream === choice.key}
                          onClick={() => setDream(choice.key)}
                        >
                          <span aria-hidden="true">{choice.emoji}</span>
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="waitlist-honeypot" aria-hidden="true">
                    Company
                    <input
                      value={honeypot}
                      onChange={(event) => setHoneypot(event.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                  <div className="waitlist-email-row">
                    <label>
                      <span>Email address</span>
                      <input
                        ref={emailInputRef}
                        id="waitlist-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@email.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={status === "submitting"}
                        required
                      />
                    </label>
                    <button
                      className="button primary"
                      type="submit"
                      disabled={!consented || status === "submitting"}
                    >
                      {status === "submitting" ? "Saving your spot…" : "Join the waitlist"}
                    </button>
                  </div>
                  <label className="waitlist-consent">
                    <input
                      type="checkbox"
                      checked={consented}
                      onChange={(event) => setConsented(event.target.checked)}
                      disabled={status === "submitting"}
                      required
                    />
                    <span>
                      Send me SavePixie launch updates. I can unsubscribe whenever I want. Read the{" "}
                      <a href="/legal/privacy">privacy notice</a>.
                    </span>
                  </label>
                  {message ? (
                    <p className="waitlist-message" role="alert">
                      {message}
                    </p>
                  ) : null}
                </>
              )}
            </form>
            <span className="waitlist-dialog__reassurance">
              Free waitlist · No card · No bank connection
            </span>
          </div>
        </div>
      ) : null}
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <span className="landing-pill">
            <span>✦</span> For every “I&apos;ll start next month”
          </span>
          <h1 id="landing-title">
            Your dream deserves more than <em>maybe someday.</em>
          </h1>
          <p>
            SavePixie turns small money choices into visible progress toward something you really
            want—one tiny, doable saving move at a time.
          </p>
          <div className="landing-waitlist-launch">
            <a className="button primary" href="#join-waitlist">
              <span>Join the waitlist</span>
              <span aria-hidden="true">→</span>
            </a>
            <span>Free · No card · Takes less than a minute</span>
          </div>
          <div className="landing-beta-install">
            <InstallPwaButton compact />
            <small>Already testing? Keep SavePixie on your Home Screen.</small>
          </div>
        </div>
        <div
          className="landing-hero__visual"
          role="img"
          aria-label={`A SavePixie phone preview showing a Japan savings goal growing by ${formatMoney(sampleMove, landingCurrency)}`}
        >
          <span className="landing-orbit landing-orbit--one" />
          <span className="landing-orbit landing-orbit--two" />
          <div className="landing-phone">
            <div className="landing-phone__topbar">
              <span>9:41</span>
              <span>SavePixie</span>
              <span>•••</span>
            </div>
            <div className="landing-phone__pixie">
              <PixieMark size="medium" mood="happy" />
              <span>6 day streak ✦</span>
            </div>
            <div className="landing-phone__goal">
              <span className="landing-phone__goal-emoji">✈️</span>
              <div>
                <small>Japan trip</small>
                <strong>{formatMoney(sampleSaved, landingCurrency)}</strong>
                <span>of {formatMoney(sampleTarget, landingCurrency)}</span>
              </div>
              <div className="progress-track">
                <span style={{ width: "35%" }} />
              </div>
            </div>
            <div className="landing-phone__move">
              <span>Today&apos;s tiny move</span>
              <strong>Pause one impulse buy</strong>
              <small>Move the same amount toward Japan instead.</small>
              <button type="button" tabIndex={-1}>
                Save {formatMoney(sampleMove, landingCurrency)}
              </button>
            </div>
          </div>
          <span className="landing-float landing-float--saved">
            + {formatMoney(sampleMove, landingCurrency)} saved
          </span>
          <span className="landing-float landing-float--closer">35% closer</span>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <header className="landing-section__heading">
          <span className="eyebrow">Daily life is loud</span>
          <h2>Saving should not require becoming a different person.</h2>
          <p>
            Big goals feel distant. Budgets feel like homework. SavePixie makes the next useful step
            small enough to do today—and satisfying enough to repeat tomorrow.
          </p>
        </header>
        <div className="landing-steps" id="your-dream">
          <article>
            <span className="landing-step-icon">🌱</span>
            <small>01 · Pick the dream</small>
            <strong>Give your money somewhere exciting to go.</strong>
            <p>A trip, a safety buffer, a future home—or your own beautifully specific thing.</p>
          </article>
          <article>
            <span className="landing-step-icon">✦</span>
            <small>02 · Make one move</small>
            <strong>Do one tiny thing that works in real life.</strong>
            <p>Pause, swap, save, or gently plan the week. No giant spreadsheet required.</p>
          </article>
          <article>
            <span className="landing-step-icon">🌈</span>
            <small>03 · Feel it getting closer</small>
            <strong>Watch “someday” turn into visible progress.</strong>
            <p>Your goal grows, your Pixie reacts, and useful saving becomes a habit.</p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-section--together">
        <div className="landing-together__copy">
          <span className="eyebrow">Your goal, your way</span>
          <h2>Build your own momentum—or share the magic.</h2>
          <p>
            Save for yourself, with a partner, or with a small group. Everyone keeps their own money
            in their own Savings Home. SavePixie keeps the promise visible.
          </p>
        </div>
        <div className="landing-mode-cards" aria-label="Solo and shared saving modes">
          <article>
            <span>☀️</span>
            <div>
              <small>Solo goal</small>
              <strong>My freedom buffer</strong>
              <div className="progress-track">
                <span style={{ width: "62%" }} />
              </div>
            </div>
          </article>
          <article>
            <span>🌙</span>
            <div>
              <small>Shared circle · 3 savers</small>
              <strong>Our summer escape</strong>
              <div className="progress-track">
                <span style={{ width: "41%" }} />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-cta" id="early-access">
        <div className="landing-cta__pixie">
          <PixieMark size="medium" mood="happy" />
        </div>
        <div className="landing-cta__copy">
          <span className="eyebrow">Small price. Real progress.</span>
          <h2>What should your next small win grow into?</h2>
          <p>
            Join the free early list. The expected early plan is roughly the equivalent of
            <strong> US$5/month</strong>, shown in your local currency, with a genuinely useful free
            starting experience.
          </p>
        </div>
        <a className="button primary" href="#join-waitlist">
          Save my early spot
        </a>
      </section>
    </div>
  );
}

export default HomePage;
