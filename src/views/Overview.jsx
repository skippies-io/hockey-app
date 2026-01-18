import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import React from 'react';

export default function Overview({ groups = [] }) {
  const navigate = useNavigate();
  const { activeTournament } = useTournament();
  


  // Default to standard age group if none active, or first in list
  const defaultAgeId = groups[0]?.id || "U9M";

  const goFixtures = () => navigate(`/${defaultAgeId}/fixtures`);
  const goStandings = () => navigate(`/${defaultAgeId}/standings`);
  const goTeams = () => navigate(`/${defaultAgeId}/teams`);
  
  const tournamentName = activeTournament?.name || "HJ All Stars";

  return (
    <div className="page-stack">


      <div className="page-section">
        {/* Hero Card */}
        <div className="hj-card hj-card--highlight" style={{ 
            background: 'linear-gradient(135deg, var(--hj-color-surface-highlight) 0%, #ffffff 100%)',
            border: '1px solid var(--hj-color-brand-soft)' 
        }}>
            <div className="flex items-center gap-4 mb-4">
                 <div>
                    <h1 style={{ 
                        fontSize: 'var(--hj-font-size-xl)', 
                        fontWeight: 'var(--hj-font-weight-bold)',
                        color: 'var(--hj-color-ink)',
                        lineHeight: 1.1,
                        marginBottom: 4
                    }}>
                        {tournamentName}
                    </h1>
                    <p style={{ color: 'var(--hj-color-ink-muted)', fontSize: 'var(--hj-font-size-sm)' }}>
                        Overview Dashboard
                    </p>
                 </div>
            </div>
            
            <p style={{ marginBottom: 'var(--hj-space-4)', lineHeight: 1.5 }}>
                Welcome to the official hub for {tournamentName}. Access real-time fixtures, standings, and team updates.
            </p>

             <div className="welcome-actions">
                <button className="btn-primary" onClick={goFixtures}>
                  View Fixtures
                </button>
                <button className="btn-secondary" onClick={goStandings}>
                  View Standings
                </button>
              </div>
        </div>
      </div>

      {/* Quick Links / Stats Grid (Placeholder for future) */}
      <div className="page-section">
          <h2 className="hj-section-header-title">Explore</h2>
          <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div 
                className="hj-card" 
                role="button" 
                tabIndex="0"
                onClick={() => navigate('/franchises')} 
                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') navigate('/franchises'); }}
                style={{ cursor: 'pointer' }}
              >
                  <h3 className="font-bold mb-2">Clubs</h3>
                  <p className="text-sm text-gray-500">Directory of all participating clubs.</p>
              </div>
              <div 
                className="hj-card" 
                role="button" 
                tabIndex="0"
                onClick={goTeams} 
                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') goTeams(); }}
                style={{ cursor: 'pointer' }}
              >
                  <h3 className="font-bold mb-2">Teams</h3>
                  <p className="text-sm text-gray-500">Browse all teams by age group.</p>
              </div>
               <div 
                className="hj-card" 
                role="button" 
                tabIndex="0"
                onClick={() => navigate('/feedback')} 
                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') navigate('/feedback'); }}
                style={{ cursor: 'pointer' }}
               >
                  <h3 className="font-bold mb-2">Feedback</h3>
                  <p className="text-sm text-gray-500">Have a suggestion? Let us know.</p>
              </div>
          </div>
      </div>
    </div>
  );
}

Overview.propTypes = {
  groups: PropTypes.array,
};
