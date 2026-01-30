import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function AnnouncementBanner({ announcements }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('hj_dismissed_announcements') || '[]');
    const active = announcements.filter(a => !dismissed.includes(a.id));
    setVisible(active);
  }, [announcements]);

  if (visible.length === 0) return null;

  function dismiss(id) {
    const dismissed = JSON.parse(localStorage.getItem('hj_dismissed_announcements') || '[]');
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem('hj_dismissed_announcements', JSON.stringify(dismissed));
    }
    setVisible(visible.filter(a => a.id !== id));
  }

  // Standard CSS mapping for severities
  const styles = {
    container: { display: 'flex', flexDirection: 'column', width: '100%', gap: '4px' },
    banner: (severity) => {
      let colors = { bg: '#eff6ff', text: '#1e40af', border: '#dbeafe' };
      if (severity === 'alert') colors = { bg: '#fef2f2', text: '#991b1b', border: '#fee2e2' };
      if (severity === 'warning') colors = { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5' };
      if (severity === 'success') colors = { bg: '#ecfdf5', text: '#065f46', border: '#d1fae5' };
      
      return {
        display: 'flex',
        alignItems: 'flex-start', // allow multi-line alignment
        justifyContent: 'space-between',
        padding: '10px 16px',
        fontSize: '13px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        color: colors.text,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        minHeight: '40px', // Ensure minimum touch target
      };
    },
    title: { fontWeight: '800', marginRight: '8px', flexShrink: 0 },
    body: { flex: 1, opacity: 0.9, wordBreak: 'break-word', lineHeight: '1.4' },
    closeBtn: { 
      background: 'none', 
      border: 'none', 
      cursor: 'pointer', 
      fontSize: '20px', 
      lineHeight: '1', 
      padding: '0 4px', 
      color: 'inherit', 
      opacity: 0.5, 
      fontWeight: 'bold',
      marginTop: '-2px', // optical alignment
      marginLeft: '8px'
    }
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