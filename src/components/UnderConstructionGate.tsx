import { useEffect, useState } from "react";

const STORAGE_KEY = "savepixie-construction-dismissed";

function ConstructionIcon() {
  return (
    <svg
      className="construction-gate__icon"
      viewBox="0 0 128 128"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="construction-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <pattern
          id="construction-stripes"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45 0 0)"
        >
          <rect width="4" height="8" fill="#0f172a" />
          <rect x="4" width="4" height="8" fill="#38bdf8" opacity="0.55" />
        </pattern>
      </defs>
      <circle cx="64" cy="64" r="60" fill="rgba(15, 23, 42, 0.9)" stroke="#1f2937" strokeWidth="2" />
      <path
        d="M64 22 18 101h92L64 22zm0 21 28.2 48H35.8L64 43z"
        fill="url(#construction-gradient)"
        stroke="rgba(15, 23, 42, 0.4)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M40 93h48L64 59 40 93z" fill="url(#construction-stripes)" opacity="0.9" />
      <circle cx="64" cy="88" r="6" fill="#f8fafc" />
      <rect x="60" y="54" width="8" height="22" rx="3" fill="#f8fafc" />
    </svg>
  );
}

export function UnderConstructionGate() {
  const [isVisible, setIsVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem(STORAGE_KEY);
    setIsVisible(!dismissed);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || typeof document === "undefined") {
      return;
    }

    document.body.classList.toggle("construction-locked", isVisible);

    return () => {
      document.body.classList.remove("construction-locked");
    };
  }, [isVisible, isReady]);

  const handleContinue = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
    setIsVisible(false);
  };

  if (!isReady || !isVisible) {
    return null;
  }

  return (
    <div className="construction-gate" role="dialog" aria-modal="true" aria-labelledby="construction-title">
      <div className="construction-gate__scrim" aria-hidden="true" />
      <div className="construction-gate__dialog" aria-describedby="construction-description">
        <ConstructionIcon />
        <h2 id="construction-title">We&apos;re still setting things up</h2>
        <p id="construction-description">
          You&apos;ve caught SavePixie in its workshop phase. We&apos;re crafting a magical saving experience and can&apos;t wait to share
          it with you.
        </p>
        <button type="button" onClick={handleContinue} className="construction-gate__continue">
          Continue anyway
        </button>
      </div>
    </div>
  );
}

export default UnderConstructionGate;
