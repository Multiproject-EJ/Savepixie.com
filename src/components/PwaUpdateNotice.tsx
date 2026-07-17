import { useEffect, useState } from "react";

export const PWA_UPDATE_EVENT = "savepixie:update-ready";

export function PwaUpdateNotice() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const showUpdate = () => setUpdateReady(true);
    window.addEventListener(PWA_UPDATE_EVENT, showUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, showUpdate);
  }, []);

  if (!updateReady) return null;

  return (
    <aside className="pwa-update-notice" role="status" aria-live="polite">
      <span aria-hidden="true">✦</span>
      <div>
        <strong>A fresh SavePixie is ready</strong>
        <small>Refresh when you’re ready. Your saved progress is safe.</small>
      </div>
      <button className="button secondary" type="button" onClick={() => window.location.reload()}>
        Refresh
      </button>
      <button
        className="pwa-update-notice__later"
        type="button"
        onClick={() => setUpdateReady(false)}
        aria-label="Refresh later"
      >
        ×
      </button>
    </aside>
  );
}

export default PwaUpdateNotice;
