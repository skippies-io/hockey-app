// src/lib/analytics.js

export function trackPageView() {
  try {
    const page_path = window.location.pathname + window.location.hash;
    console.log("[GA] page_view ->", page_path);     // TEMP LOG
    if (typeof window.gtag === "function") {
      window.gtag("event", "page_view", { page_path, debug_mode: true });
    } else {
      console.warn("gtag not found; page_view skipped", page_path);
    }
  } catch (e) {
    console.error("trackPageView error", e);
  }
}

export function trackEvent(name, params = {}) {
  try {
    console.log("[GA] event ->", name, params);      // TEMP LOG
    if (typeof window.gtag === "function") {
      window.gtag("event", name, { ...params, debug_mode: true });
    }
  } catch (e) {
    console.error("trackEvent error", name, params, e);
  }
}
