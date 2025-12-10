import { useEffect, useState } from "react";
import "./InstallBanner.css";

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isIos = /iP(hone|od|ad)/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isIos && isSafari;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari()) return;
    if (window.navigator.standalone === true) return;
    if (localStorage.getItem("hj_install_dismissed")) return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem("hj_install_dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="install-banner" role="status">
      <img
        className="install-banner__icon"
        src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
        alt="HJ All Stars"
      />
      <div className="install-banner__text">
        <div className="install-banner__title">
          Add HJ All Stars to your Home Screen
        </div>
        <div className="install-banner__subtitle">
          Tap Share → Add to Home Screen
        </div>
      </div>
      <button
        type="button"
        className="install-banner__close"
        aria-label="Dismiss add to home screen prompt"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  );
}
