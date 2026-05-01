import { useEffect, useState } from "react";

const STORAGE_KEY = "hj_theme";

function getInitialTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* noop */ }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {theme === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}
