// Minimal GA4 helper for HashRouter apps

export function trackPageView() {
  try {
    const page_path = window.location.pathname + window.location.hash;
    if (typeof window.gtag === "function") {
      // GA4 page_view
      window.gtag("event", "page_view", { page_path });
    } else {
      console.warn("gtag not found; page_view skipped", page_path);
    }
  } catch (e) {
    console.error("trackPageView error", e);
  }
}

// Optional: simple event helper
export function trackEvent(name, params = {}) {
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch (e) {
    console.error("trackEvent error", name, params, e);
  }
}
