import { useEffect, useState } from "react";

type ConnectionState = "online" | "offline" | "restored";

export function NetworkStatus() {
  const [connection, setConnection] = useState<ConnectionState>(() =>
    navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    let restoredTimer: number | undefined;

    const handleOffline = () => {
      window.clearTimeout(restoredTimer);
      setConnection("offline");
    };

    const handleOnline = () => {
      setConnection((current) => (current === "offline" ? "restored" : "online"));
      window.clearTimeout(restoredTimer);
      restoredTimer = window.setTimeout(() => setConnection("online"), 3600);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearTimeout(restoredTimer);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (connection === "online") return null;

  return (
    <div
      className={`network-status network-status--${connection}`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">{connection === "offline" ? "◌" : "✦"}</span>
      <p>
        <strong>{connection === "offline" ? "You’re offline" : "You’re back online"}</strong>
        <small>
          {connection === "offline"
            ? "You can look around, but saving changes needs a connection."
            : "Saving and syncing are ready again."}
        </small>
      </p>
    </div>
  );
}

export default NetworkStatus;
