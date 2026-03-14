import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import PageHeading from '../components/PageHeading';
import { getTournaments } from '../lib/api';

export default function Tournaments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <Card>Loading tournaments...</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <PageHeading title="Tournaments" />
        <Card className="text-red-600">Error loading tournaments.</Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeading title="Tournament Directory" />

      {items.length === 0 && (
        <Card>No tournaments found.</Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--hj-space-4)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {items.map((t) => (
          <div key={t.id} className="hj-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-3)' }}>
              <div style={{ width: 48, height: 48, background: 'var(--hj-color-surface-muted)', borderRadius: 'var(--hj-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontWeight: 'bold', color: 'var(--hj-color-ink-muted)' }}>{t.name ? t.name[0] : '?'}</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--hj-font-size-md)', fontWeight: 'var(--hj-font-weight-semibold)' }}>
                  {t.name || t.id}
                </h3>
                {t.season && (
                  <p style={{ margin: 0, fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-ink-muted)' }}>
                    {t.season}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
