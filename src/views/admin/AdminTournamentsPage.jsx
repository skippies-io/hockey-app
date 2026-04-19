import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminTournaments, setTournamentActive } from '../../lib/tournamentApi';

export default function AdminTournamentsPage() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toggleError, setToggleError] = useState(null);

  useEffect(() => {
    let alive = true;
    getAdminTournaments()
      .then((data) => { if (alive) setTournaments(data); })
      .catch((err) => { if (alive) setLoadError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const handleToggle = async (tournament) => {
    const next = !tournament.is_active;

    if (next) {
      const otherActive = tournaments.find((t) => t.id !== tournament.id && t.is_active);
      if (otherActive) {
        const ok = window.confirm(
          `"${otherActive.name}" is already marked live. Activate "${tournament.name}" as well?`
        );
        if (!ok) return;
      }
    }

    setTogglingId(tournament.id);
    setToggleError(null);
    // Optimistic update
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournament.id ? { ...t, is_active: next } : t))
    );

    try {
      const updated = await setTournamentActive(tournament.id, next);
      setTournaments((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
      );
    } catch (err) {
      // Rollback
      setTournaments((prev) =>
        prev.map((t) => (t.id === tournament.id ? { ...t, is_active: tournament.is_active } : t))
      );
      setToggleError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <div style={{ padding: 'var(--hj-space-4)' }}>Loading…</div>;
  if (loadError) return <div role="alert" style={{ color: '#c00', padding: 'var(--hj-space-4)' }}>{loadError}</div>;

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--hj-space-6)' }}>
        <h1 style={{ margin: 0 }}>Tournaments</h1>
        <button
          type="button"
          className="admin-btn-primary"
          onClick={() => navigate('/admin/tournaments/new')}
        >
          + Create tournament
        </button>
      </div>

      {toggleError && (
        <div role="alert" style={{ color: '#c00', marginBottom: 'var(--hj-space-4)', fontSize: 'var(--hj-font-size-sm)' }}>
          {toggleError}
        </div>
      )}

      {tournaments.length === 0 && (
        <p style={{ color: 'var(--hj-color-text-secondary)' }}>No tournaments yet.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-3)' }}>
        {tournaments.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--hj-space-4)',
              border: '1px solid var(--hj-color-border-subtle)',
              borderRadius: 'var(--hj-radius-md)',
              background: 'var(--hj-color-surface-1)',
            }}
          >
            <div>
              <div style={{ fontWeight: 'var(--hj-font-weight-semibold)', marginBottom: 'var(--hj-space-1)' }}>
                {t.name}
              </div>
              <div style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-secondary)' }}>
                {t.season || '—'} · ID: {t.id}
              </div>
            </div>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-2)', cursor: togglingId === t.id ? 'wait' : 'pointer' }}
              title={t.is_active ? 'Click to deactivate' : 'Click to activate'}
            >
              <span style={{ fontSize: 'var(--hj-font-size-sm)', color: t.is_active ? 'var(--hj-color-success, #16a34a)' : 'var(--hj-color-text-secondary)' }}>
                {t.is_active ? 'Live' : 'Inactive'}
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label={`Tournament is live: ${t.name}`}
                checked={t.is_active}
                disabled={togglingId === t.id}
                onChange={() => handleToggle(t)}
                style={{ width: 18, height: 18, cursor: 'inherit', accentColor: 'var(--hj-color-brand-primary)' }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
