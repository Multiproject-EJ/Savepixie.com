function HomePage() {
  return (
    <section className="hero">
      <h1>
        Save with confidence,
        <br /> one habit at a time.
      </h1>
      <p>
        SavePixie helps you set purposeful goals, celebrate your wins, and stay on track with a playful
        savings coach in your pocket.
      </p>
      <div className="card-grid">
        <article className="card">
          <h2>Plan</h2>
          <p>Define clear savings goals with deadlines, colors, and emojis that spark motivation.</p>
        </article>
        <article className="card">
          <h2>Act</h2>
          <p>Log deposits in seconds and watch your streaks, badges, and progress fill up.</p>
        </article>
        <article className="card">
          <h2>Celebrate</h2>
          <p>Earn points, badges, and playful encouragement to keep momentum going.</p>
        </article>
      </div>
    </section>
  );
}

export default HomePage;
