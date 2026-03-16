import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNotificationPrefs } from "../lib/notificationPrefs";

const SEVERITY_COLORS = {
  info:    { bg: "var(--hj-color-info-soft)",    text: "var(--hj-color-info-ink)" },
  alert:   { bg: "var(--hj-color-danger-soft)",  text: "var(--hj-color-danger-ink)" },
  warning: { bg: "var(--hj-color-warning-soft)", text: "var(--hj-color-warning-ink)" },
  success: { bg: "var(--hj-color-success-soft)", text: "var(--hj-color-success-ink)" },
};

export default function NotificationBell({ announcements = [] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const { unreadCount, isDismissed, dismiss } = useNotificationPrefs(announcements);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (announcements.length === 0) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 6px",
          lineHeight: 1,
          fontSize: "1.2rem",
          color: "var(--hj-color-text-muted, #555)",
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              backgroundColor: "var(--hj-color-danger-ink, #c0392b)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "700",
              lineHeight: "16px",
              textAlign: "center",
              padding: "0 3px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 200,
            minWidth: "280px",
            maxWidth: "340px",
            background: "var(--hj-color-surface, #fff)",
            border: "1px solid var(--hj-color-border, #e2e8f0)",
            borderRadius: "10px",
            boxShadow: "var(--hj-shadow-md, 0 4px 16px rgba(0,0,0,0.12))",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px 8px",
              fontWeight: 700,
              fontSize: "13px",
              borderBottom: "1px solid var(--hj-color-border, #e2e8f0)",
              color: "var(--hj-color-text, #1a1a1a)",
            }}
          >
            Notifications
          </div>

          <ul
            aria-label="Notification list"
            style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: "320px", overflowY: "auto" }}
          >
            {announcements.map((a) => {
              const colors = SEVERITY_COLORS[a.severity] ?? SEVERITY_COLORS.info;
              const read = isDismissed(a.id);
              return (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--hj-color-border-light, #f1f5f9)",
                    opacity: read ? 0.55 : 1,
                    backgroundColor: read ? "transparent" : colors.bg,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: colors.text,
                        marginBottom: "2px",
                      }}
                    >
                      {a.title}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--hj-color-text, #1a1a1a)",
                        lineHeight: "1.4",
                        wordBreak: "break-word",
                      }}
                    >
                      {a.body}
                    </div>
                  </div>
                  {!read && (
                    <button
                      aria-label={`Dismiss: ${a.title}`}
                      onClick={() => dismiss(a.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "16px",
                        lineHeight: 1,
                        padding: "0 2px",
                        color: colors.text,
                        opacity: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {announcements.length === 0 && (
            <p style={{ padding: "14px", fontSize: "13px", color: "var(--hj-color-text-muted, #888)", margin: 0 }}>
              No notifications
            </p>
          )}
        </div>
      )}
    </div>
  );
}

NotificationBell.propTypes = {
  announcements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      body: PropTypes.string.isRequired,
      severity: PropTypes.string.isRequired,
    })
  ),
};
