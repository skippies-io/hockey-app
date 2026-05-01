import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { getFixturesRows } from '../lib/api';

export default function Overview({ groups = [] }) {
  const navigate = useNavigate();
  const { activeTournament, activeTournamentId } = useTournament();
  const tournamentName = activeTournament?.name || 'HJ All Stars';
  const defaultAgeId = groups[0]?.id || 'U9M';

  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeTournamentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getFixturesRows(activeTournamentId, 'all')
      .then(setFixtures)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTournamentId]);

  const today = new Date().toISOString().slice(0, 10);
  const live = fixtures.filter(f => String(f.status || '').toLowerCase() === 'live');
  const todayFixtures = fixtures.filter(f => f.date === today);
  const next = fixtures
    .filter(f => !f.homeScore && f.date >= today && String(f.status || '').toLowerCase() !== 'final')
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];

  const goTeams = () => navigate(`/${defaultAgeId}/teams`);

  const exploreCards = [
    { label: 'Tournaments', icon: 'public',      desc: 'Browse all tournaments',   onClick: () => navigate('/tournaments') },
    { label: 'Clubs',       icon: 'shield',      desc: 'View club directory',       onClick: () => navigate('/franchises') },
    { label: 'Teams',       icon: 'groups',      desc: `${groups.length} age group${groups.length !== 1 ? 's' : ''}`, onClick: goTeams },
    { label: 'Feedback',    icon: 'rate_review', desc: 'Share your feedback',       onClick: () => navigate('/feedback') },
  ];

  return (
    <div className="page-stack">
      <div className="page-section">
        <div className="overview-hero">
          <h1 className="overview-hero-title">{tournamentName}</h1>
          {loading ? (
            <div className="overview-stats-row" aria-label="Loading match statistics">
              <span className="overview-stat overview-stat--skeleton" />
              <span className="overview-stat overview-stat--skeleton" />
            </div>
          ) : (
            <div className="overview-stats-row">
              {live.length > 0 && (
                <span className="overview-stat overview-stat--live">
                  <span className="overview-live-dot" aria-hidden="true" />
                  {live.length} Live
                </span>
              )}
              <span className="overview-stat">{todayFixtures.length} today</span>
              <span className="overview-stat">{groups.length} pools</span>
            </div>
          )}
          {!loading && next && (
            <p className="overview-next-fixture">
              Next: <strong>{next.homeTeam} vs {next.awayTeam}</strong>
              {next.time && <span className="overview-next-time">{next.time}</span>}
            </p>
          )}
          {!loading && todayFixtures.length === 0 && live.length === 0 && (
            <p className="overview-next-fixture overview-next-fixture--muted">No fixtures today</p>
          )}
        </div>
      </div>

      <div className="page-section">
        <h2 className="hj-section-header-title">Explore</h2>
        <div className="overview-explore-grid">
          {exploreCards.map((card) => (
            <a
              key={card.label}
              className="overview-explore-card"
              role="link"
              tabIndex="0"
              onClick={card.onClick}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') card.onClick(); }}
              aria-label={card.label}
            >
              <span className="overview-explore-icon material-symbols-outlined" aria-hidden="true">{card.icon}</span>
              <div>
                <div className="overview-explore-label">{card.label}</div>
                <div className="overview-explore-desc">{card.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

Overview.propTypes = {
  groups: PropTypes.array,
};
