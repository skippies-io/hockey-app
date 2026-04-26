/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { tournamentsEndpoint } from '../lib/api';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const [activeTournamentId, setActiveTournamentId] = useState(() => {
    try {
      const raw = localStorage.getItem('hj_active_tournament');
      return typeof raw === 'string' && raw ? raw : null;
    } catch {
      return null;
    }
  });
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      const url = tournamentsEndpoint();
      console.warn('TournamentContext init', { url });
      if (!url) {
        console.error('TournamentContext disabled: tournaments endpoint unavailable.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setAvailableTournaments(json.data);

          // If no active tournament is set (or the valid one isn't in list anymore), default to the first one (most recent usually)
          if (!activeTournamentId) {
             // Default to the first one in the list (assuming backend sorts DESC/recent first)
             setActiveTournamentId(json.data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch tournaments:', { url, error });
      } finally {
        setLoading(false);
      }
    }
    void fetchTournaments();
  }, []); // Run once on mount

  useEffect(() => {
    if (activeTournamentId && typeof activeTournamentId === 'string') {
      // Strip any characters outside the expected token alphabet before persisting
      // so tainted API data cannot write arbitrary strings to local storage.
      const safeId = activeTournamentId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
      if (safeId) {
        try {
          localStorage.setItem('hj_active_tournament', safeId);
        } catch {
          // ignore storage failures (e.g. Safari private mode)
        }
      }
    }
  }, [activeTournamentId]);

  // Derived state: the full object for the active tournament
  const activeTournament = useMemo(
    () => availableTournaments.find(t => t.id === activeTournamentId) ?? null,
    [availableTournaments, activeTournamentId]
  );

  const contextValue = useMemo(
    () => ({ activeTournamentId, setActiveTournamentId, availableTournaments, loading, activeTournament }),
    [activeTournamentId, availableTournaments, loading, activeTournament]
  );

  return (
    <TournamentContext.Provider value={contextValue}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}

TournamentProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
