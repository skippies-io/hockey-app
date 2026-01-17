import React from 'react';
import { useTournament } from '../context/TournamentContext';

export default function TournamentSwitcher() {
  const { activeTournamentId, setActiveTournamentId, availableTournaments, loading } = useTournament();

  if (loading || availableTournaments.length <= 1) {
    return null; // Don't show if loading or only 1 option
  }

  return (
    <div className="tournament-switcher" style={{ display: 'flex', alignItems: 'center', gap: 'var(--hj-space-2)' }}>
      <span style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-ink-muted)', fontWeight: 'var(--hj-font-weight-medium)' }}>
        Select Tournament:
      </span>
      <select 
        value={activeTournamentId || ""} 
        onChange={(e) => setActiveTournamentId(e.target.value)}
        className="hj-input tournament-select"
        style={{ 
            fontSize: 'var(--hj-font-size-sm)', 
            padding: 'var(--hj-spacing-xs) var(--hj-spacing-sm)',
            borderRadius: 'var(--hj-radius-md)',
            border: '1px solid var(--hj-border-color)',
            backgroundColor: 'var(--hj-card-bg)',
            color: 'var(--hj-text-primary)'
        }}
      >
        {availableTournaments.map(t => (
          <option key={t.id} value={t.id}>
            {t.name || t.id}
          </option>
        ))}
      </select>
    </div>
  );
}
