import { useEffect, useState } from "react";

export function useShowFollowedPreference(view) {
  const keySuffix = String(view || "unknown").toLowerCase();
  const storageKey = `hj_show_followed_${keySuffix}_v1`;

  const [showOnlyFollowed, setShowOnlyFollowed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === "true" || raw === "false") {
        setShowOnlyFollowed(raw === "true");
      } else {
        setShowOnlyFollowed(false);
      }
    } catch {
      // ignore read errors
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, showOnlyFollowed ? "true" : "false");
    } catch {
      // ignore write errors
    }
  }, [storageKey, showOnlyFollowed]);

  return [showOnlyFollowed, setShowOnlyFollowed];
}
