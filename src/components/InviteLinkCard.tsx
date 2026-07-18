import { useEffect, useRef, useState } from "react";

type CopyStatus = "ready" | "copied" | "manual";

export function InviteLinkCard({
  url,
  onDismiss,
  className = "",
}: {
  url: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("ready");
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => setCopyStatus("ready"), [url]);

  const selectLink = () => {
    linkRef.current?.focus();
    linkRef.current?.select();
  };

  const copyLink = async () => {
    if (!navigator.clipboard?.writeText) {
      selectLink();
      setCopyStatus("manual");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      selectLink();
      setCopyStatus("manual");
    }
  };

  return (
    <div className={`invite-link-card ${className}`.trim()} role="status" aria-live="polite">
      <span className="invite-link-card__spark" aria-hidden="true">
        ◎
      </span>
      <div className="invite-link-card__copy">
        <strong>
          {copyStatus === "copied"
            ? "Invitation copied"
            : copyStatus === "manual"
              ? "Link selected—copy it from your browser"
              : "Private invitation ready"}
        </strong>
        <small>It works once and expires after seven days.</small>
        <input
          ref={linkRef}
          aria-label="Private invitation link"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      <div className="invite-link-card__actions">
        <button className="button secondary compact-button" type="button" onClick={copyLink}>
          {copyStatus === "copied" ? "Copied" : "Copy link"}
        </button>
        {onDismiss ? (
          <button
            className="icon-button"
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss invitation"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default InviteLinkCard;
