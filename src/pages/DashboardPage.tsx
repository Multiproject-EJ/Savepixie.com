import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/AuthProvider";
import { fetchProfile, type ProfileRow, updateProfile } from "../features/profile/api";

function formatDisplayName(profile: ProfileRow | null, fallback: string | null): string {
  if (profile?.display_name) {
    return profile.display_name;
  }

  if (fallback) {
    return fallback.split("@")[0];
  }

  return "there";
}

function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ displayName: "", username: "" });

  useEffect(() => {
    if (!user) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetchProfile(user.id)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setForm({
          displayName: result?.display_name ?? "",
          username: result?.username ?? "",
        });
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Unable to load your profile.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const greeting = useMemo(() => formatDisplayName(profile, user?.email ?? null), [profile, user?.email]);
  const createdAtLabel = useMemo(() => {
    if (!profile?.created_at) return "–";
    try {
      return new Date(profile.created_at).toLocaleString();
    } catch (cause) {
      console.warn("Unable to format created_at", cause);
      return profile.created_at;
    }
  }, [profile?.created_at]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateProfile(user.id, {
        displayName: form.displayName.trim() ? form.displayName.trim() : null,
        username: form.username.trim() ? form.username.trim() : null,
      });
      setProfile(updated);
      setSuccess("Profile updated successfully.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome, {greeting}!</h1>
          <p className="dashboard-subtitle">
            This is your personal savings headquarters. Update your profile and get ready for goals,
            streaks, and more.
          </p>
        </div>
      </header>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="dashboard-grid">
        <article className="card profile-card">
          <header>
            <h2>Your account details</h2>
          </header>

          {loading ? (
            <p className="muted">Loading profile…</p>
          ) : (
            <dl className="profile-meta">
              <div>
                <dt>Email</dt>
                <dd>{user?.email ?? "–"}</dd>
              </div>
              <div>
                <dt>Display name</dt>
                <dd>{profile?.display_name ?? "Add a friendly name"}</dd>
              </div>
              <div>
                <dt>Username</dt>
                <dd>{profile?.username ? `@${profile.username}` : "Choose a username"}</dd>
              </div>
              <div>
                <dt>Profile created</dt>
                <dd>{createdAtLabel}</dd>
              </div>
            </dl>
          )}
        </article>

        <article className="card profile-card">
          <header>
            <h2>Update your profile</h2>
            <p className="muted">Choose a display name and username to personalize SavePixie.</p>
          </header>

          <form className="form" onSubmit={handleSubmit}>
            <label className="form-control">
              <span>Display name</span>
              <input
                value={form.displayName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, displayName: event.target.value }))
                }
                placeholder="Pixie Pal"
                disabled={saving || loading}
                maxLength={80}
              />
            </label>

            <label className="form-control">
              <span>Username</span>
              <input
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="pixiepal"
                disabled={saving || loading}
                maxLength={32}
              />
            </label>

            <button className="button primary" type="submit" disabled={saving || loading}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <p className="form-footnote">
              Your profile updates instantly and apply across every device where you use SavePixie.
            </p>
          </form>
        </article>
      </div>

      <article className="card highlight-card">
        <h2>Coming soon: savings goals</h2>
        <p>
          Next we will introduce colorful goal cards and deposit tracking so you can visualize your
          progress toward each milestone.
        </p>
      </article>
    </section>
  );
}

export default DashboardPage;
