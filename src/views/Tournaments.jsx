import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import PageHeading from '../components/PageHeading';
import { getTournaments } from '../lib/api';
import { useTournament } from '../context/TournamentContext';

export default function Tournaments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { activeTournamentId, setActiveTournamentId } = useTournament() || {};
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    getTournaments()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((err) => {
        if (alive) setError(err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-stack">
        <PageHeading title="Tournaments" />
        <Card role="status">Loading tournaments...</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <PageHeading title="Tournaments" />
        <Card role="alert" className="text-red-600">Error loading tournaments.</Card>
      </div>
    );
  }

  function handleView(tournamentId) {
    if (setActiveTournamentId) {
      setActiveTournamentId(tournamentId);
    }
    navigate('/');
  }

  return (
    <div className="page-stack">
      <PageHeading title="Tournament Directory" />

      {items.length === 0 && (
        <Card>No tournaments found.</Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--hj-space-4)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {items.map((t) => {
          const isActive = t.id === activeTournamentId;
          return (
            <div key={t.id} className="hj-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-3)' }}>
                {t.logo_url ? (
                  <img
                    src={t.logo_url}
                    alt={`${t.name || t.id} logo`}
                    style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 'var(--hj-radius-md)', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 48, height: 48, background: 'var(--hj-color-surface-muted)', borderRadius: 'var(--hj-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--hj-color-ink-muted)' }}>{t.name ? t.name[0] : '?'}</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-2)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--hj-font-size-md)', fontWeight: 'var(--hj-font-weight-semibold)' }}>
                      {t.name || t.id}
                    </h3>
                    {isActive && (
                      <span
                        aria-label="Currently active tournament"
                        style={{ fontSize: 'var(--hj-font-size-xs)', background: 'var(--hj-color-brand)', color: '#fff', borderRadius: 'var(--hj-radius-sm)', padding: '2px 6px', fontWeight: 600 }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  {t.season && (
                    <p style={{ margin: 0, fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-ink-muted)' }}>
                      {t.season}
                    </p>
                  )}
                </div>
              </div>
              {!isActive && (
                <button
                  type="button"
                  onClick={() => handleView(t.id)}
                  style={{ marginTop: 'var(--hj-space-1)', alignSelf: 'flex-start', cursor: 'pointer' }}
                  className="pill is-action"
                >
                  View Tournament
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
