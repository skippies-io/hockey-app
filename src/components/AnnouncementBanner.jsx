import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function AnnouncementBanner({ announcements }) {
  const [visible, setVisible] = useState([]);
  const storageKey = 'hj_dismissed_announcements';

  function readDismissedIds() {
    let dismissed = [];
    try {
      dismissed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(dismissed)) dismissed = [];
    } catch {
      dismissed = [];
    }
    // Only allow string IDs into storage to avoid persisting unexpected objects.
    return dismissed.filter((x) => typeof x === 'string');
  }

  useEffect(() => {
    const dismissed = readDismissedIds();
    const active = announcements.filter(a => !dismissed.includes(a.id));
    setVisible(active);
  }, [announcements]);

  if (visible.length === 0) return null;

  function dismiss(id) {
    if (typeof id !== 'string' || !id) return;

    const dismissed = readDismissedIds();

    if (!dismissed.includes(id)) {
      dismissed.push(id);
      // Only persist a simple JSON array.
      try {
        localStorage.setItem(storageKey, JSON.stringify(dismissed));
      } catch {
        // ignore
      }
    }
    setVisible(visible.filter(a => a.id !== id));
  }

  // Severity → design token mapping
  const SEVERITY_TOKENS = {
    info:    { bg: 'var(--hj-color-info-soft)',    text: 'var(--hj-color-info-ink)',    border: 'var(--hj-color-info-soft)' },
    alert:   { bg: 'var(--hj-color-danger-soft)',  text: 'var(--hj-color-danger-ink)',  border: 'var(--hj-color-danger-soft)' },
    warning: { bg: 'var(--hj-color-warning-soft)', text: 'var(--hj-color-warning-ink)', border: 'var(--hj-color-warning-soft)' },
    success: { bg: 'var(--hj-color-success-soft)', text: 'var(--hj-color-success-ink)', border: 'var(--hj-color-success-soft)' },
  };

  const styles = {
    container: { display: 'flex', flexDirection: 'column', width: '100%', gap: 'var(--hj-space-1)' },
    banner: (severity) => {
      const colors = SEVERITY_TOKENS[severity] ?? SEVERITY_TOKENS.info;
      return {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '10px var(--hj-space-4)',
        fontSize: '13px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        color: colors.text,
        boxShadow: 'var(--hj-shadow-sm)',
        minHeight: 'var(--hj-space-8)',
      };
    },
    title: { fontWeight: '800', marginRight: 'var(--hj-space-2)', flexShrink: 0 },
    body: { flex: 1, opacity: 0.9, wordBreak: 'break-word', lineHeight: 'var(--hj-line-height-default)' },
    closeBtn: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--hj-font-size-lg)',
      lineHeight: '1',
      padding: 'var(--hj-space-0) var(--hj-space-1)',
      color: 'inherit',
      opacity: 0.5,
      fontWeight: 'bold',
      marginTop: '-2px', // optical alignment
      marginLeft: 'var(--hj-space-2)',
    },
  };

  return (
    <div style={styles.container}>
      {visible.map(a => (
        <div key={a.id} style={styles.banner(a.severity)} role="alert">
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
            <span style={styles.title}>{a.title}</span>
            <span style={styles.body}>{a.body}</span>
          </div>
          <button 
            style={styles.closeBtn} 
            onClick={() => dismiss(a.id)} 
            aria-label="Dismiss announcement"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

AnnouncementBanner.propTypes = {
  announcements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      body: PropTypes.string.isRequired,
      severity: PropTypes.string.isRequired,
    })
  ).isRequired,
};
