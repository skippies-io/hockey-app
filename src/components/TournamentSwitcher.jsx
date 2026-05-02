import React from 'react';
import { useTournament } from '../context/TournamentContext';

export default function TournamentSwitcher() {
  const { activeTournamentId, setActiveTournamentId, availableTournaments, loading } = useTournament();

  if (loading || availableTournaments.length === 0) return null;

  return (
    <select
      id="tournament-switcher-select"
      aria-label="Select Tournament:"
      value={activeTournamentId || ""}
      onChange={(e) => setActiveTournamentId(e.target.value)}
      className="tournament-switcher-select"
    >
      {availableTournaments.map(t => (
        <option key={t.id} value={t.id}>{t.name || t.id}</option>
      ))}
    </select>
  );
}
