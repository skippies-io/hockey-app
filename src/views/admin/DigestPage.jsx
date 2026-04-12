import { useEffect, useState } from 'react';
import { adminFetch } from '../../lib/adminAuth';
import { getTournaments } from '../../lib/api';

async function apiFetch(method, params = {}) {
  if (method === 'GET') {
    const qs = params.tournamentId ? `?tournamentId=${encodeURIComponent(params.tournamentId)}` : '';
    const res = await adminFetch(`/admin/digests${qs}`);
    return res.json();
  }

  if (method === 'POST') {
    const res = await adminFetch('/admin/digests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  }

  if (method === 'DELETE') {
    const res = await adminFetch(`/admin/digests?id=${encodeURIComponent(params.id)}`, { method: 'DELETE' });
    return res.json();
  }
}

function formatExpiry(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

function buildShareUrl(token) {
  return `${window.location.origin}/share/${token}`;
}

export default function DigestPage() {
  const [links, setLinks] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listErr, setListErr] = useState(null);

  const [tournaments, setTournaments] = useState([]);
  const [formTournamentId, setFormTournamentId] = useState('');
  const [formAgeId, setFormAgeId] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState(null);
  const [newLink, setNewLink] = useState(null);

  const loadLinks = () => {
    setLoadingList(true);
    setListErr(null);
    apiFetch('GET')
      .then((j) => {
        if (j.ok) setLinks(j.data || []);
        else setListErr(j.error || 'Failed to load links');
        setLoadingList(false);
      })
      .catch((e) => { setListErr(e.message); setLoadingList(false); });
  };

  useEffect(() => { loadLinks(); }, []);

  useEffect(() => {
    getTournaments()
      .then((data) => setTournaments(data || []))
      .catch(() => {}); // silently ignore; admin can still see the form
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateErr(null);
    setNewLink(null);
    try {
      const j = await apiFetch('POST', {
        tournament_id: formTournamentId.trim(),
        age_id: formAgeId.trim() || null,
        label: formLabel.trim() || null,
      });
      if (!j.ok) throw new Error(j.error || 'Failed');
      setNewLink({ token: j.token, expires_at: j.expires_at });
      setFormTournamentId('');
      setFormAgeId('');
      setFormLabel('');
      loadLinks();
    } catch (err) {
      setCreateErr(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await apiFetch('DELETE', { id });
      loadLinks();
    } catch (err) {
      alert(`Failed to revoke: ${err.message}`);
    }
  };

  const containerStyle = { maxWidth: '900px', margin: '0 auto', padding: 'var(--hj-space-4)' };
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: 'var(--hj-radius-md)',
    padding: 'var(--hj-space-5)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: 'var(--hj-space-4)',
  };
  const inputStyle = {
    width: '100%', padding: '8px 10px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    fontSize: '0.9rem', marginBottom: 'var(--hj-space-3)',
    boxSizing: 'border-box',
  };
  const btnStyle = {
    padding: '8px 16px', borderRadius: '6px', border: 'none',
    backgroundColor: 'var(--hj-color-brand-primary)', color: 'white',
    cursor: 'pointer', fontSize: '0.9rem',
  };
  const revokeBtnStyle = {
    padding: '4px 10px', borderRadius: '4px', border: '1px solid #d1d5db',
    backgroundColor: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem',
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: 'var(--hj-space-2)' }}>Digest Share Links</h1>
      <p style={{ marginBottom: 'var(--hj-space-4)', color: '#6b7280', fontSize: '0.9rem' }}>
        Share links give read-only, time-limited access to fixtures, standings, and scores — no login required.
        Links expire after 14 days and can be revoked at any time.
      </p>

      <div style={cardStyle}>
        <h2 style={{ marginBottom: 'var(--hj-space-3)', fontSize: '1rem' }}>Create New Link</h2>
        <form onSubmit={handleCreate}>
          <label htmlFor="digest-tournament-id" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
            Tournament *
          </label>
          <select
            id="digest-tournament-id"
            style={inputStyle}
            value={formTournamentId}
            onChange={(e) => setFormTournamentId(e.target.value)}
            required
          >
            <option value="">Select a tournament…</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name || t.id}</option>
            ))}
          </select>

          <label htmlFor="digest-age-id" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
            Age Group (optional — leave blank for all ages)
          </label>
          <input
            id="digest-age-id"
            style={inputStyle}
            value={formAgeId}
            onChange={(e) => setFormAgeId(e.target.value)}
            placeholder="e.g. U12"
          />

          <label htmlFor="digest-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>
            Label (optional)
          </label>
          <input
            id="digest-label"
            style={inputStyle}
            value={formLabel}
            onChange={(e) => setFormLabel(e.target.value)}
            placeholder="e.g. U12 Boys — Parent view"
            maxLength={120}
          />

          {createErr && <p style={{ color: '#dc2626', marginBottom: 'var(--hj-space-2)' }}>{createErr}</p>}

          <button type="submit" style={btnStyle} disabled={creating}>
            {creating ? 'Creating…' : 'Create share link'}
          </button>
        </form>

        {newLink && (
          <div style={{ marginTop: 'var(--hj-space-4)', padding: 'var(--hj-space-3)', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
            <p style={{ marginBottom: 'var(--hj-space-2)', fontWeight: 'bold', color: '#15803d' }}>
              Link created! Copy it now — it will not be shown again.
            </p>
            <input
              readOnly
              value={buildShareUrl(newLink.token)}
              onClick={(e) => e.target.select()}
              style={{ ...inputStyle, marginBottom: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}
              aria-label="Share URL"
            />
            <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Expires {formatExpiry(newLink.expires_at)}
            </p>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginBottom: 'var(--hj-space-3)', fontSize: '1rem' }}>Existing Links</h2>
        {loadingList && <p>Loading…</p>}
        {listErr && <p style={{ color: '#dc2626' }}>{listErr}</p>}
        {!loadingList && !listErr && links.length === 0 && (
          <p style={{ color: '#6b7280' }}>No share links yet.</p>
        )}
        {links.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Tournament</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Age</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Label</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Created by</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Expires</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>Status</th>
                <th style={{ padding: '6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const revoked = Boolean(l.revoked_at);
                const expired = new Date(l.expires_at) < new Date();
                const status = revoked ? 'Revoked' : expired ? 'Expired' : 'Active';
                const statusColor = status === 'Active' ? '#15803d' : '#6b7280';
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 8px' }}>{l.tournament_id}</td>
                    <td style={{ padding: '6px 8px' }}>{l.age_id || 'All'}</td>
                    <td style={{ padding: '6px 8px' }}>{l.label || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{l.created_by}</td>
                    <td style={{ padding: '6px 8px' }}>{formatExpiry(l.expires_at)}</td>
                    <td style={{ padding: '6px 8px', color: statusColor, fontWeight: 'bold' }}>{status}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {status === 'Active' && (
                        <button
                          type="button"
                          style={revokeBtnStyle}
                          onClick={() => handleRevoke(l.id)}
                          aria-label={`Revoke share link ${l.id}`}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
