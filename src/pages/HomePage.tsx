import { Link } from "react-router-dom";
import PixieMark from "../components/PixieMark";

function HomePage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <span className="landing-pill">
            <span>✦</span> Saving that feels like progress
          </span>
          <h1>
            Small choices.
            <br />
            <em>Brighter tomorrows.</em>
          </h1>
          <p>
            SavePixie turns one tiny money action each day into visible progress toward something
            you genuinely want.
          </p>
          <div className="landing-actions">
            <Link className="button primary" to="/auth#sign-up">
              Start my first goal
            </Link>
            <a className="button secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
          <span className="landing-reassurance">
            No bank connection needed · Start in about a minute
          </span>
        </div>
        <div className="landing-hero__visual" aria-label="SavePixie goal progress preview">
          <span className="landing-orbit landing-orbit--one" />
          <span className="landing-orbit landing-orbit--two" />
          <PixieMark size="large" mood="happy" />
          <div className="floating-goal-card">
            <span>✈️</span>
            <div>
              <small>Japan trip</small>
              <strong>
                4 200 kr <em>of 12 000 kr</em>
              </strong>
              <div className="progress-track">
                <span style={{ width: "35%" }} />
              </div>
            </div>
          </div>
          <div className="floating-streak-card">
            <span>✦</span>
            <strong>6 day streak</strong>
          </div>
        </div>
      </section>

      <section className="landing-section" id="how-it-works">
        <header className="landing-section__heading">
          <span className="eyebrow">The one-minute loop</span>
          <h2>Saving works better when it feels alive.</h2>
          <p>One clear action, instant feedback, and progress you can actually care about.</p>
        </header>
        <div className="landing-steps">
          <article>
            <span>01</span>
            <strong>See today&apos;s tiny quest</strong>
            <p>One useful money action—not a wall of charts.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Do something real</strong>
            <p>Save a little, log a choice, or adjust the week.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Watch your goal grow</strong>
            <p>Your Pixie reacts and your meaningful goal visibly moves.</p>
          </article>
        </div>
      </section>

      <section className="landing-section landing-section--split" id="why-savepixie">
        <div>
          <span className="eyebrow">Playful, never childish</span>
          <h2>A money app that does less—and helps you do more.</h2>
          <p>
            SavePixie is not accounting software. It is a calm savings-habit companion for young
            adults and anyone who wants money progress to feel lighter.
          </p>
        </div>
        <ul className="landing-checklist">
          <li>
            <span>✓</span> One dominant action at a time
          </li>
          <li>
            <span>✓</span> Manual-first and private by default
          </li>
          <li>
            <span>✓</span> Real goals stay more important than points
          </li>
          <li>
            <span>✓</span> Works beautifully on phone and desktop
          </li>
        </ul>
      </section>

      <section className="landing-cta">
        <PixieMark size="medium" mood="happy" />
        <div>
          <span className="eyebrow">Ready when you are</span>
          <h2>What should your first 50 kr grow into?</h2>
        </div>
        <Link className="button primary" to="/auth#sign-up">
          Meet your Pixie
        </Link>
      </section>
    </div>
  );
}

export default HomePage;
