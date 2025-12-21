// src/components/InstallPrompt.jsx
import React, { useEffect, useState, useCallback } from "react";

/**
 * InstallPrompt
 * - Android/desktop Chrome/Edge: shows a button when `beforeinstallprompt` fires.
 * - iOS Safari: shows a hint (Share → Add to Home Screen).
 * - Remembers "Not now" per browser via localStorage.
 * - Added: 1s delay + fade/slide-in animation.
 * - Updated: full-width bottom bar (token-based) to match prior banner behaviour.
 */
export default function InstallPrompt() {
  const [supportsPrompt, setSupportsPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandalone, setIsInStandalone] = useState(false);
  const [ready, setReady] = useState(false); // delay before showing
  const [visible, setVisible] = useState(false); // controls fade/slide

  useEffect(() => {
    // 1s delay before showing (for fade-in)
    const timer = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Detect iOS and standalone mode
    const ua = navigator.userAgent || "";
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(iOS);

    const standalone =
      matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true;
    setIsInStandalone(standalone);

    setDismissed(localStorage.getItem("hj_install_dismissed") === "1");

    // beforeinstallprompt (Android/desktop)
    const onBIP = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setSupportsPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // Installed event
    const onInstalled = () => {
      setInstalled(true);
      setSupportsPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem("hj_install_dismissed");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== "accepted") {
      localStorage.setItem("hj_install_dismissed", "1");
      setDismissed(true);
    }
    setDeferredPrompt(null);
    setSupportsPrompt(false);
  }, [deferredPrompt]);

  const handleNotNow = useCallback(() => {
    localStorage.setItem("hj_install_dismissed", "1");
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      setVisible(false);
      return;
    }

    const canShow =
      !installed &&
      !isInStandalone &&
      !dismissed &&
      ((isIOS && !supportsPrompt) || supportsPrompt);

    setVisible(canShow);
  }, [ready, installed, isInStandalone, dismissed, isIOS, supportsPrompt]);

  // If already installed (standalone) or dismissed, render nothing
  if (installed || isInStandalone || dismissed) return null;

  // Nothing to show
  if (!supportsPrompt && !isIOS) return null;

  const animatedBarStyle = {
    ...barStyle,
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(12px)",
    transition: "opacity 220ms ease-out, transform 220ms ease-out",
    pointerEvents: visible ? "auto" : "none",
  };

  // iOS hint
  if (isIOS && !supportsPrompt) {
    return (
      <div style={animatedBarStyle} role="status" aria-live="polite">
        <span style={{ lineHeight: 1.4, minWidth: 0 }}>
          Add this app to your Home Screen:
          <br />
          <strong>Share</strong> → <strong>Add to Home Screen</strong>
        </span>
        <button onClick={handleNotNow} style={ghostBtnStyle}>
          Got it
        </button>
      </div>
    );
  }

  // Android/desktop button
  if (supportsPrompt) {
    return (
      <div style={animatedBarStyle} role="status" aria-live="polite">
        <span style={{ minWidth: 0 }}>Install the HJ app</span>
        <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
          <button onClick={handleNotNow} style={ghostBtnStyle}>
            Not now
          </button>
          <button onClick={handleInstallClick} style={primaryBtnStyle}>
            Install
          </button>
        </div>
      </div>
    );
  }

  return null;
}

const barStyle = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,

  padding: "12px 14px",
  paddingBottom: "calc(12px + env(safe-area-inset-bottom))",

  background: "var(--hj-color-surface)",
  color: "var(--hj-color-ink)",
  borderTop: "1px solid var(--hj-color-border-subtle)",
  boxShadow: "0 -8px 24px rgba(15, 23, 42, 0.12)",
};

const primaryBtnStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--hj-color-brand)",
  background: "var(--hj-color-brand)",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const ghostBtnStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--hj-color-border-strong)",
  background: "transparent",
  color: "var(--hj-color-ink)",
  cursor: "pointer",
  fontWeight: 600,
};
