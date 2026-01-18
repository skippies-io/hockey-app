// src/views/Team.jsx
import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageIntroCard from "../components/PageIntroCard";
import { getStandingsRows } from "../lib/api";
import { teamProfilePath } from "../lib/routes";

// --- Favorites helpers (shared behaviour with Fixtures/Standings) ---
const FAV_KEY = "hj_favorites_v1";

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function useFavorites() {
  const [favs, setFavs] = useState(() => loadFavorites());

  const toggle = (teamName) => {
    setFavs((current) => {
      const exists = current.includes(teamName);
      const next = exists
        ? current.filter((t) => t !== teamName)
        : [...current, teamName];
      saveFavorites(next);
      return next;
    });
  };

  return { favs, toggle };
}

export default function Team({ ageId, ageLabel }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const { favs, toggle } = useFavorites();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Pull teams from standings; store unique, sorted names
        const rows = await getStandingsRows(ageId);
        if (!alive) return;

        const names = Array.from(
          new Set(
            (rows || [])
              .map((r) => String(r.Team || r.team || "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));

        setTeams(names);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ageId]);


  const displayedTeams = useMemo(
    () => (onlyFollowing ? teams.filter((t) => favs.includes(t)) : teams),
    [teams, favs, onlyFollowing]
  );

  const introCard = (
    <PageIntroCard
      eyebrow="Teams"
      title={`${ageLabel} — Teams`}
      description="Browse all teams in this age group. Star teams to highlight them elsewhere."
    />
  );

  const filterCard = (
    <Card className="filters-card">
      <div className="hj-filter-row">
        <label className="hj-checkbox-label">
          <input
            type="checkbox"
            checked={onlyFollowing}
            onChange={(e) => setOnlyFollowing(e.target.checked)}
          />
          Show only followed teams ({favs.length})
        </label>
      </div>
    </Card>
  );

  if (loading || err) {
    return (
      <div className="page-stack">
        <div className="page-section">
          {introCard}
          {filterCard}
        </div>
        <Card className={err ? "text-red-600" : undefined}>
          {err ? `Error: ${err}` : "Loading teams…"}
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-section">
        {introCard}
        {filterCard}
      </div>

      <Card>
        <div className="hj-section-header">
          <h2 className="hj-section-header-title">{`Teams — ${ageLabel}`}</h2>
        </div>

        {displayedTeams.length === 0 ? (
          <div>No teams found yet.</div>
        ) : (
          <ul className="teams-list">
            {displayedTeams.map((team) => {
              const isFav = favs.includes(team);
              return (
                <li key={team} className="teams-list-item">
                  <button
                    type="button"
                    onClick={() => toggle(team)}
                    aria-label={isFav ? "Unfavourite team" : "Favourite team"}
                    className="star-btn"
                  >
                    <span className={`star ${isFav ? "is-on" : "is-off"}`}>
                      {isFav ? "★" : "☆"}
                    </span>
                  </button>
                  <Link to={teamProfilePath(ageId, team)} className="team-link">
                    {team}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="teams-footer-link">
          <Link to={`/${ageId}/fixtures`}>View fixtures</Link>
        </div>
      </Card>
    </div>
  );
}

Team.propTypes = {
  ageId: PropTypes.string.isRequired,
  ageLabel: PropTypes.string.isRequired,
};
