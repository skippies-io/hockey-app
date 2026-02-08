import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../lib/api';

// Character Limits
const MAX_TITLE = 50;
const MAX_BODY = 280;

// CSS Styles (No Tailwind allowed)
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'var(--hj-space-4)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 1fr) 2fr', // 2-column: 1/3 sidebar, 2/3 main
    gap: 'var(--hj-space-6)',
    alignItems: 'start',
  },
  // Fallback for mobile
  '@media (max-width: 768px)': {
     grid: { gridTemplateColumns: '1fr' }
  },
  sidebar: {
    position: 'sticky',
    top: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 'var(--hj-radius-md)',
    padding: 'var(--hj-space-5)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 'var(--hj-space-4)',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--hj-space-4)',
    gap: 'var(--hj-space-3)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--hj-space-3)',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '0.85rem',
    backgroundColor: 'white',
    color: '#111827',
  },
  filterTabs: {
    display: 'flex',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '4px',
    gap: '4px',
  },
  tab: (active) => ({
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    background: active ? 'white' : 'transparent',
    color: active ? '#111827' : '#6b7280',
    fontWeight: active ? '600' : '500',
    fontSize: '0.875rem',
    cursor: 'pointer',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    transition: 'all 0.2s',
  }),
  formGroup: { marginBottom: 'var(--hj-space-4)' },
  label: { 
    display: 'block', 
    fontWeight: '600', 
    fontSize: '0.9rem', 
    marginBottom: 'var(--hj-space-2)',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem',
    outline: 'none',
  },
  counter: (current, max) => {
    const isNear = current > max * 0.9;
    const isOver = current >= max;
    return {
      fontSize: '0.75rem',
      marginTop: '4px',
      textAlign: 'right',
      color: isOver ? 'var(--hj-color-danger-ink)' : isNear ? '#d97706' : '#9ca3af',
      fontWeight: isOver ? 'bold' : 'normal',
    };
  },
  // CSS Toggle Switch
  toggleWrapper: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' },
  toggleTrack: (checked) => ({
    width: '44px',
    height: '24px',
    backgroundColor: checked ? 'var(--hj-color-success-ink)' : '#d1d5db',
    borderRadius: '999px',
    position: 'relative',
    transition: 'background-color 0.2s',
  }),
  toggleThumb: (checked) => ({
    width: '20px',
    height: '20px',
    backgroundColor: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transform: checked ? 'translateX(20px)' : 'translateX(0)',
    transition: 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }),
  historyList: {
    maxHeight: 'calc(100vh - 220px)',
    overflowY: 'auto',
    paddingRight: '6px',
  },
  listItem: (isDraft) => ({
    borderTop: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    borderRight: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: isDraft ? '#f9fafb' : 'white',
    opacity: isDraft ? 0.85 : 1,
    borderLeft: isDraft ? '4px solid #9ca3af' : '1px solid #e5e7eb',
  }),
  badge: (severity) => {
    let bg = '#eff6ff', text = '#1e40af';
    if (severity === 'alert') { bg = '#fef2f2'; text = '#991b1b'; }
    if (severity === 'warning') { bg = '#fff7ed'; text = '#9a3412'; }
    if (severity === 'success') { bg = '#ecfdf5'; text = '#065f46'; }
    if (severity === 'draft') { bg = '#f3f4f6'; text = '#374151'; }
    
    return {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '700',
      textTransform: 'uppercase',
      backgroundColor: bg,
      color: text,
      marginRight: '8px',
    };
  }
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, published, draft
  const [contextFilter, setContextFilter] = useState('all'); // all, general, tournament id
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    body: '', 
    severity: 'info',
    tournament_id: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [annsRes, tournsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/announcements`),
        fetch(`${API_BASE}/tournaments`)
      ]);

      if (annsRes.ok) {
        const json = await annsRes.json();
        setAnnouncements(json.data || []);
      }
      if (tournsRes.ok) {
        const json = await tournsRes.json();
        setTournaments(Array.isArray(json) ? json : (json.data || []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Populate form for Editing
  function handleEdit(item) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingId(item.id);
    setFormData({
      title: item.title,
      body: item.body,
      severity: item.severity,
      tournament_id: item.tournament_id || '',
    });
    setError(null);
  }

  // Populate form for Cloning (Reuse)
  function handleClone(item) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setEditingId(null); // New Item
    setFormData({
      title: item.title,
      body: item.body,
      severity: item.severity,
      tournament_id: item.tournament_id || '',
    });
    setError(null);
  }

  // Handle Delete
  async function handleDelete(id, e) {
    e.stopPropagation(); // prevent triggering edit
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const res = await fetch(`${API_BASE}/admin/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        // If we were editing this item, clear the form
        if (editingId === id) resetForm();
      } else {
        alert("Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting.");
    }
  }

  function resetForm() {
    setEditingId(null);
    setFormData({ title: '', body: '', severity: 'info', tournament_id: '' });
    setError(null);
  }

  // Save (Draft or Publish)
  async function handleSave(isPublished) {
    if (formData.title.length > MAX_TITLE || formData.body.length > MAX_BODY) {
      setError("Please fix character limit errors before saving.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      tournament_id: formData.tournament_id || null,
      is_published: isPublished,
      refresh_date: isPublished // If publishing, refresh the date to bring it to top
    };

    const url = editingId 
      ? `${API_BASE}/admin/announcements/${editingId}`
      : `${API_BASE}/admin/announcements`;
    
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.ok) {
        resetForm();
        await fetchData();
      } else {
        setError(json.error || "Failed to save.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Filter Logic
  const filteredList = announcements.filter(a => {
    if (filter === 'published' && !a.is_published) return false;
    if (filter === 'draft' && a.is_published) return false;
    if (contextFilter === 'general' && a.tournament_id) return false;
    if (contextFilter !== 'all' && contextFilter !== 'general' && a.tournament_id !== contextFilter) return false;
    return true;
  });

  return (
    <div style={styles.container}>
      <h1 className="hj-heading-page" style={{ marginBottom: 'var(--hj-space-6)' }}>Announcements Manager</h1>

      <div style={styles.grid}>
        
        {/* LEFT COLUMN: CONTROL PANEL */}
        <div style={styles.sidebar}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                {editingId ? 'Edit Announcement' : 'Create New'}
              </h2>
              {editingId && (
                <button 
                  onClick={resetForm} 
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
            
            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={e => e.preventDefault()}>
              {/* Title */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Title</label>
                <input 
                  type="text" 
                  style={{ ...styles.input, fontFamily: 'Arial, sans-serif' }}
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                  placeholder="Headline..."
                />
                <div style={styles.counter(formData.title.length, MAX_TITLE)}>
                  {formData.title.length}/{MAX_TITLE}
                </div>
              </div>

              {/* Body */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Message</label>
                <textarea 
                  style={{ ...styles.input, minHeight: '100px', resize: 'vertical', fontFamily: 'Arial, sans-serif' }}
                  value={formData.body}
                  onChange={e => setFormData({...formData, body: e.target.value})}
                  required
                  placeholder="What's the update?"
                />
                <div style={styles.counter(formData.body.length, MAX_BODY)}>
                  {formData.body.length}/{MAX_BODY}
                </div>
              </div>

              {/* Context */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Context</label>
                <select 
                  style={{ ...styles.input, fontFamily: 'Arial, sans-serif' }}
                  value={formData.tournament_id}
                  onChange={e => setFormData({...formData, tournament_id: e.target.value})}
                >
                  <option value="">General (Global)</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                  {formData.tournament_id ? 'Visible only in this tournament.' : 'Visible on Home & all pages.'}
                </div>
              </div>

              {/* Severity */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Severity</label>
                <select 
                  style={{ ...styles.input, fontFamily: 'Arial, sans-serif' }}
                  value={formData.severity}
                  onChange={e => setFormData({...formData, severity: e.target.value})}
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="alert">Alert</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                 <button 
                   type="button" 
                   onClick={() => handleSave(false)}
                   disabled={submitting}
                   style={{ 
                     flex: 1, 
                     padding: '10px', 
                     borderRadius: '6px', 
                     border: '1px solid #d1d5db', 
                     backgroundColor: 'white', 
                     color: '#374151', 
                     fontWeight: '600',
                     cursor: submitting ? 'not-allowed' : 'pointer'
                   }}
                 >
                   Save Draft
                 </button>
                 <button 
                   type="button" 
                   onClick={() => handleSave(true)}
                   disabled={submitting}
                   style={{ 
                     flex: 1, 
                     padding: '10px', 
                     borderRadius: '6px', 
                     border: 'none', 
                     backgroundColor: '#10b981', 
                     color: 'white', 
                     fontWeight: '600',
                     cursor: submitting ? 'not-allowed' : 'pointer',
                     boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                   }}
                 >
                   {editingId ? 'Update & Publish' : 'Publish Now'}
                 </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: HISTORY */}
        <div>
          <div style={styles.headerRow}>
            <div style={styles.headerLeft}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>History</h2>
              <select
                aria-label="Context filter"
                style={styles.filterSelect}
                value={contextFilter}
                onChange={(e) => setContextFilter(e.target.value)}
              >
                <option value="all">All Contexts</option>
                <option value="general">General (Global)</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.filterTabs}>
              {['all', 'published', 'draft'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={styles.tab(filter === f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}

          {!loading && filteredList.length === 0 ? (
             <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '2px dashed #e5e7eb', color: '#9ca3af' }}>
               No announcements found.
             </div>
          ) : (
            <div style={styles.historyList}>
              {filteredList.map(a => (
                <div 
                  key={a.id} 
                  style={{
                    ...styles.listItem(!a.is_published),
                    cursor: 'pointer',
                    position: 'relative',
                    border: editingId === a.id ? '2px solid #3b82f6' : styles.listItem(!a.is_published).border
                  }}
                  onClick={() => handleEdit(a)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEdit(a); } }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={styles.badge(a.severity)}>{a.severity}</span>
                      {!a.is_published && <span style={styles.badge('draft')}>Draft</span>}
                      {a.tournament_id && (
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                          Target: {tournaments.find(t => t.id === a.tournament_id)?.name || a.tournament_id}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                       <span style={{ fontSize: '0.8rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                         {new Date(a.created_at).toLocaleDateString()}
                       </span>
                       <div 
                         style={{ display: 'flex', gap: '4px' }} 
                         onClick={e => e.stopPropagation()}
                         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
                         role="group"
                         tabIndex={-1}
                       >
                         <button 
                           onClick={(e) => { e.stopPropagation(); handleClone(a); }}
                           title="Clone / Reuse"
                           style={{ padding: '4px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', color: '#6b7280', fontSize: '0.75rem' }}
                         >
                           Clone
                         </button>
                         <button 
                           onClick={(e) => handleDelete(a.id, e)}
                           title="Delete"
                           style={{ padding: '4px', background: 'none', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}
                         >
                           🗑️
                         </button>
                       </div>
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>{a.title}</h3>
                  <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
