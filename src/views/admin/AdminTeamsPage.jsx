import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminFetch } from '../../lib/adminAuth';
import { getTournaments } from '../../lib/api';
import { useTournament } from '../../context/TournamentContext';
import { teamProfilePath } from '../../lib/routes';

export default function AdminTeamsPage() {
  const { activeTournament } = useTournament();

  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState('');
  const [teams, setTeams] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [error, setError] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getTournaments();
        if (!alive) return;
        setTournaments(data || []);
        const defaultId = activeTournament?.id || (data?.[0]?.id ?? '');
        setTournamentId(defaultId);
      } catch (e) {
        if (!alive) return;
        setError(`Failed to load tournaments: ${e.message}`);
      } finally {
        if (alive) setLoadingTournaments(false);
      }
    })();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!tournamentId) {
      setTeams([]);
      return;
    }

    let alive = true;
    (async () => {
      setError('');
      setLoadingTeams(true);
      try {
        const res = await adminFetch(`/admin/teams?tournamentId=${encodeURIComponent(tournamentId)}`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        if (!alive) return;
        setTeams(json.data || []);
      } catch (e) {
        if (!alive) return;
        setError(`Failed to load teams: ${e.message}`);
        setTeams([]);
      } finally {
        if (alive) setLoadingTeams(false);
      }
    })();
    return () => { alive = false; };
  }, [tournamentId]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const team of teams) {
      const key = team.group_label || 'Ungrouped';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(team);
    }
    return map;
  }, [teams]);

  const divisions = useMemo(() => [...grouped.keys()].sort((a, b) => a.localeCompare(b)), [grouped]);

  const filteredGrouped = useMemo(() => {
    if (!divisionFilter) return grouped;
    const m = new Map();
    if (grouped.has(divisionFilter)) m.set(divisionFilter, grouped.get(divisionFilter));
    return m;
  }, [grouped, divisionFilter]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--hj-space-6)',
        }}
      >
        <h1 style={{ margin: 0 }}>Teams</h1>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 'var(--hj-space-3)',
            marginBottom: 'var(--hj-space-4)',
            backgroundColor: '#fee',
            color: '#c00',
            borderRadius: 'var(--hj-radius-md)',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--hj-space-4)', marginBottom: 'var(--hj-space-4)', flexWrap: 'wrap' }}>
        <div>
          <label htmlFor="teams-tournament-select" style={{ marginRight: 'var(--hj-space-2)' }}>
            Tournament:
          </label>
          <select
            id="teams-tournament-select"
            aria-label="Tournament"
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            disabled={loadingTournaments}
          >
            {loadingTournaments ? (
              <option value="">Loading…</option>
            ) : (
              <>
                <option value="">Select tournament</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name || t.id}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div>
          <label htmlFor="teams-division-select" style={{ marginRight: 'var(--hj-space-2)' }}>
            Division:
          </label>
          <select
            id="teams-division-select"
            aria-label="Division"
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            disabled={loadingTeams || divisions.length === 0}
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {loadingTeams && <div>Loading teams…</div>}

      {!loadingTeams && !error && tournamentId && teams.length === 0 && (
        <div
          style={{
            padding: 'var(--hj-space-4)',
            textAlign: 'center',
            color: 'var(--hj-color-text-secondary)',
          }}
        >
          No teams found for this tournament.
        </div>
      )}

      {!loadingTeams && filteredGrouped.size > 0 && (
        <div>
          {[...filteredGrouped.entries()].map(([groupLabel, groupTeams]) => (
            <div key={groupLabel} style={{ marginBottom: 'var(--hj-space-6)' }}>
              <h2 style={{ marginBottom: 'var(--hj-space-3)', fontSize: '1.1rem' }}>
                {groupLabel}
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--hj-color-border)' }}>
                    <th style={{ padding: 'var(--hj-space-3)', textAlign: 'left', fontWeight: 'var(--hj-font-weight-bold)' }}>
                      Name
                    </th>
                    <th style={{ padding: 'var(--hj-space-3)', textAlign: 'left', fontWeight: 'var(--hj-font-weight-bold)' }}>
                      Pool
                    </th>
                    <th style={{ padding: 'var(--hj-space-3)', textAlign: 'left', fontWeight: 'var(--hj-font-weight-bold)' }}>
                      Franchise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupTeams.map((team) => (
                    <tr
                      key={team.id}
                      style={{ borderBottom: '1px solid var(--hj-color-border-subtle)' }}
                    >
                      <td style={{ padding: 'var(--hj-space-3)' }}>
                        <Link
                          to={teamProfilePath(groupLabel, team.name)}
                          style={{ color: 'var(--hj-color-brand-primary)', textDecoration: 'none' }}
                        >
                          {team.name}
                        </Link>
                      </td>
                      <td style={{ padding: 'var(--hj-space-3)' }}>{team.pool || '—'}</td>
                      <td style={{ padding: 'var(--hj-space-3)' }}>
                        {team.franchise_dir_id ? (
                          <Link
                            to={`/admin/franchises/${team.franchise_dir_id}`}
                            style={{ color: 'var(--hj-color-brand-primary)', textDecoration: 'none' }}
                          >
                            {team.franchise_name}
                          </Link>
                        ) : (
                          team.franchise_name || '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
