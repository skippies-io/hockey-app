import React, { useEffect, useState } from 'react';
import { getFranchises } from '../lib/api';
import Card from '../components/Card';
import PageHeading from '../components/PageHeading';
import { useTournament } from "../context/TournamentContext";

export default function Franchises() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { activeTournament } = useTournament();
  const tournamentId = activeTournament?.id;

  useEffect(() => {
    let alive = true;
    if (!tournamentId) {
      setItems([]);
      setLoading(false);
      return;
    }
    getFranchises(tournamentId)
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
  }, [tournamentId]);

  if (loading) {
    return (
      <div className="page-stack">
        <PageHeading title="Franchises" />
        <Card>Loading franchises...</Card>
      </div>
    );
  }

  if (error) {
    return (
        <div className="page-stack">
           <PageHeading title="Franchises" />
           <Card className="text-red-600">Error loading franchises.</Card>
         </div>
    );
  }

  // Group or just list? For now just list.
  // Expected columns: Name, Logo, Manager, Email?
  // Let's assume naive columns for now.

  return (
    <div className="page-stack">
      <PageHeading title="Franchise Directory" />
      
      {items.length === 0 && (
         <Card>No franchises found.</Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--hj-space-4)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {items.map((f, i) => (
          <div key={i} className="hj-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-3)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-3)' }}>
                {/* Placeholder for Logo if available */}
                <div style={{ width: 48, height: 48, background: 'var(--hj-color-surface-muted)', borderRadius: 'var(--hj-radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   {/* If f.Logo exists, use it, else initial */}
                   <span style={{ fontWeight: 'bold', color: 'var(--hj-color-ink-muted)' }}>{f.Name ? f.Name[0] : '?'}</span>
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--hj-font-size-md)', fontWeight: 'var(--hj-font-weight-semibold)' }}>
                        {f.Name || "Unknown Club"}
                    </h3>
                    {f.Manager && (
                        <p style={{ margin: 0, fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-ink-muted)' }}>
                            Mgr: {f.Manager}
                        </p>
                    )}
                </div>
             </div>
             
             {f.Email && (
                 <a href={`mailto:${f.Email}`} className="btn-secondary" style={{ marginTop: 'auto', justifyContent: 'center' }}>
                    Contact Club
                 </a>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
