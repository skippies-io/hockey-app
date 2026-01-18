/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const TournamentContext = createContext(null);

export function TournamentProvider({ children }) {
  const [activeTournamentId, setActiveTournamentId] = useState(() => {
    return localStorage.getItem('hj_active_tournament') || null;
  });
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch('/api/tournaments');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setAvailableTournaments(json.data);
            
            // If no active tournament is set (or the valid one isn't in list anymore), default to the first one (most recent usually)
            if (!activeTournamentId) {
               // Default to the first one in the list (assuming backend sorts DESC/recent first)
               setActiveTournamentId(json.data[0].id);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch tournaments:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTournaments();
  }, []); // Run once on mount

  useEffect(() => {
    if (activeTournamentId) {
      localStorage.setItem('hj_active_tournament', activeTournamentId);
    }
  }, [activeTournamentId]);

  // Derived state: the full object for the active tournament
  const activeTournament = availableTournaments.find(t => t.id === activeTournamentId) || null;

  // Console log for verification
  // Console log for verification - REMOVED


  return (
    <TournamentContext.Provider value={{ activeTournamentId, setActiveTournamentId, availableTournaments, loading, activeTournament }}>
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
