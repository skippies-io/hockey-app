import React, { useEffect, useState } from 'react';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ title: '', body: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const res = await fetch('/api/admin/announcements');
      try {
        const json = await res.json();
        if (json.ok) {
          setAnnouncements(json.data);
        } else {
          console.error("Failed to fetch:", json.error);
        }
      } catch (e) {
         console.error("Non-JSON response:", e);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (json.ok) {
        setFormData({ title: '', body: '', severity: 'info' });
        fetchAnnouncements(); // Refresh list
      } else {
        setError(json.error || "Failed to create announcement");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const containerStyle = {
    maxWidth: '800px',
  };

  return (
    <div style={containerStyle}>
      <h1 className="hj-heading-page">Announcements</h1>

      {/* CREATE FORM */}
      <div className="hj-card" style={{ marginBottom: 'var(--hj-space-6)' }}>
        <h3 className="hj-section-header-title" style={{ marginBottom: 'var(--hj-space-4)' }}>New Announcement</h3>
        
        {error && (
          <div style={{ 
            color: 'var(--hj-color-danger-ink)', 
            backgroundColor: 'var(--hj-color-danger-soft)', 
            padding: 'var(--hj-space-3)', 
            borderRadius: 'var(--hj-radius-sm)',
            marginBottom: 'var(--hj-space-3)' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="hj-form">
          <div className="hj-form-field">
            <label className="hj-form-label">Title</label>
            <input 
              type="text" 
              className="hj-input"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
              placeholder="e.g. Schedule Change"
            />
          </div>
          
          <div className="hj-form-field">
            <label className="hj-form-label">Content</label>
            <textarea 
              className="hj-textarea"
              value={formData.body}
              onChange={e => setFormData({...formData, body: e.target.value})}
              required
              placeholder="Details about the announcement..."
            />
          </div>
          
          <div className="hj-form-field">
            <label className="hj-form-label">Severity</label>
            <select 
              className="hj-input"
              value={formData.severity}
              onChange={e => setFormData({...formData, severity: e.target.value})}
            >
              <option value="info">Info (Blue)</option>
              <option value="warning">Warning (Orange)</option>
              <option value="alert">Alert (Red)</option>
            </select>
            <span className="hj-form-footnote">Determines the color and urgency of the card.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--hj-space-2)' }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>

      {/* LIST */}
      <div>
        <h3 className="hj-heading-section" style={{ marginBottom: 'var(--hj-space-4)' }}>Recent Announcements</h3>
        
        {loading && <div style={{ color: 'var(--hj-color-ink-muted)' }}>Loading...</div>}
        
        {!loading && announcements.length === 0 ? (
          <p style={{ color: 'var(--hj-color-ink-muted)', fontStyle: 'italic' }}>No announcements found yet.</p>
        ) : (
          <div className="cards">
            {announcements.map(a => (
              <div key={a.id} className="hj-card">
                <div className="hj-section-header">
                  <span className={`pill ${
                    a.severity === 'alert' ? 'is-active' : '' 
                  }`} style={{
                    backgroundColor: a.severity === 'alert' ? 'var(--hj-color-danger-soft)' : 
                                     a.severity === 'warning' ? 'var(--hj-color-warning-soft)' : 
                                     'var(--hj-color-info-soft)',
                    color: a.severity === 'alert' ? 'var(--hj-color-danger-ink)' : 
                           a.severity === 'warning' ? 'var(--hj-color-warning-ink)' : 
                           'var(--hj-color-info)',
                    borderColor: 'transparent'
                  }}>
                    {a.severity.toUpperCase()}
                  </span>
                  <span className="hj-text-meta">
                    {new Date(a.created_at).toLocaleString()}
                  </span>
                </div>
                <h3 className="hj-section-header-title">{a.title}</h3>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--hj-color-ink)', lineHeight: 'var(--hj-line-height-relaxed)' }}>
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
