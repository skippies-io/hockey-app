// src/lib/notificationPrefs.js
// Manages dismissed announcement IDs so the notification bell can track unread counts.
// Reuses the same key as AnnouncementBanner for consistency.
import { useEffect, useState } from "react";

const DISMISSED_KEY = "hj_dismissed_announcements";
const EVENT = "hj:notifications";

export function readDismissed() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function dismissNotification(id) {
  const dismissed = readDismissed();
  dismissed.add(id);
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(dismissed)));
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new Event(EVENT));
}

export function isDismissed(id) {
  return readDismissed().has(id);
}

export function useNotificationPrefs(announcements = []) {
  const [dismissed, setDismissed] = useState(() => readDismissed());

  useEffect(() => {
    const onChange = () => setDismissed(readDismissed());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const unreadCount = announcements.filter((a) => !dismissed.has(a.id)).length;

  return {
    dismissed,
    unreadCount,
    isDismissed: (id) => dismissed.has(id),
    dismiss: dismissNotification,
  };
}
