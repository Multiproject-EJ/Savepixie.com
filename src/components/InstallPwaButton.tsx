import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallPwaButtonProps = {
  compact?: boolean;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIosBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallPwaButton({ compact = false }: InstallPwaButtonProps) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const requestInstall = async () => {
    if (installed) return;

    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }

    setShowInstructions((visible) => !visible);
  };

  return (
    <div className={compact ? "pwa-install pwa-install--compact" : "pwa-install"}>
      <button
        className={compact ? "button ghost" : "button secondary"}
        type="button"
        onClick={() => void requestInstall()}
        disabled={installed}
      >
        <span aria-hidden="true">{installed ? "✓" : "↓"}</span>
        {installed ? "SavePixie is installed" : "Install the beta app"}
      </button>
      {showInstructions ? (
        <p role="status">
          {isIosBrowser()
            ? "On iPhone: tap Share, then Add to Home Screen. SavePixie opens like a normal app."
            : "Open your browser menu and choose Install app or Add to Home Screen."}
        </p>
      ) : null}
    </div>
  );
}

export default InstallPwaButton;
