import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  getAdminTournaments,
  getAdminAnnouncements,
  getAdminGroups,
  getAdminTeams,
  getUnscoredFixtures,
} from '../../lib/tournamentApi';

// ── shared card shell ────────────────────────────────────────────────────────

const tournamentShape = PropTypes.arrayOf(PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
}));

function WidgetCard({ title, children }) {
  return (
    <div style={{
      background: 'var(--hj-color-surface-1)',
      border: '1px solid var(--hj-color-border-subtle)',
      borderRadius: 'var(--hj-radius-md)',
      padding: 'var(--hj-space-5)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--hj-space-3)',
    }}>
      <h2 style={{ margin: 0, fontSize: 'var(--hj-font-size-md)', fontWeight: 'var(--hj-font-weight-semibold)' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

WidgetCard.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node.isRequired };

function WidgetLoading() {
  return <p style={{ margin: 0, color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)' }}>Loading…</p>;
}

WidgetError.propTypes = { message: PropTypes.string.isRequired };
function WidgetError({ message }) {
  return <p role="alert" style={{ margin: 0, color: '#c00', fontSize: 'var(--hj-font-size-sm)' }}>{message}</p>;
}

EmptyState.propTypes = { children: PropTypes.node.isRequired };
function EmptyState({ children }) {
  return <p style={{ margin: 0, color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)' }}>{children}</p>;
}

// ── Widget 1: Live Tournaments ───────────────────────────────────────────────

function LiveTournamentsWidget() {
  const [tournaments, setTournaments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdminTournaments({ activeOnly: true })
      .then(setTournaments)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <WidgetCard title="Live Tournaments">
      {tournaments === null && !error && <WidgetLoading />}
      {error && <WidgetError message={error} />}
      {tournaments !== null && tournaments.length === 0 && (
        <EmptyState>
          No live tournaments.{' '}
          <Link to="/admin/tournaments" style={{ color: 'var(--hj-color-brand-primary)' }}>
            Go to Tournaments
          </Link>{' '}
          to activate one.
        </EmptyState>
      )}
      {tournaments !== null && tournaments.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
          {tournaments.map((t) => (
            <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'var(--hj-font-weight-semibold)' }}>{t.name}</span>
                {t.season && (
                  <span style={{ marginLeft: 'var(--hj-space-2)', color: 'var(--hj-color-text-secondary)', fontSize: 'var(--hj-font-size-sm)' }}>
                    {t.season}
                  </span>
                )}
              </div>
              <Link to="/admin/tournaments" style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-brand-primary)' }}>
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

// ── Widget 2: Announcements ──────────────────────────────────────────────────

const SEVERITY_STYLE = {
  info:    { background: '#dbeafe', color: '#1e40af' },
  success: { background: '#dcfce7', color: '#15803d' },
  warning: { background: '#fef9c3', color: '#92400e' },
  alert:   { background: '#fee2e2', color: '#991b1b' },
};

function AnnouncementsWidget() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdminAnnouncements()
      .then((all) => {
        const now = Date.now();
        setItems(
          all.filter(
            (a) => a.is_published && (!a.expires_at || new Date(a.expires_at).getTime() > now)
          )
        );
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <WidgetCard title="Announcements">
      {items === null && !error && <WidgetLoading />}
      {error && <WidgetError message={error} />}
      {items !== null && items.length === 0 && <EmptyState>No active announcements.</EmptyState>}
      {items !== null && items.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
          {items.map((a) => {
            const sty = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info;
            return (
              <li key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--hj-space-2)' }}>
                <span style={{ ...sty, borderRadius: 'var(--hj-radius-sm)', padding: '2px 7px', fontSize: 'var(--hj-font-size-xs)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {a.severity}
                </span>
                <span style={{ flex: 1, fontSize: 'var(--hj-font-size-sm)' }}>{a.title}</span>
                {a.expires_at && (
                  <span style={{ fontSize: 'var(--hj-font-size-xs)', color: 'var(--hj-color-text-secondary)', whiteSpace: 'nowrap' }}>
                    Expires {new Date(a.expires_at).toLocaleDateString()}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Link to="/admin/announcements" style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-brand-primary)', alignSelf: 'flex-start' }}>
        Manage announcements →
      </Link>
    </WidgetCard>
  );
}

// ── Widget 3: Setup Health ───────────────────────────────────────────────────

SetupHealthWidget.propTypes = { tournaments: tournamentShape };
SetupHealthWidget.defaultProps = { tournaments: null };
function SetupHealthWidget({ tournaments }) {
  const [checks, setChecks] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournaments || tournaments.length === 0) { setChecks([]); return; }

    const fetches = tournaments.map(async (t) => {
      const [groups, teams] = await Promise.all([
        getAdminGroups(t.id),
        getAdminTeams(t.id),
      ]);
      const issues = [];
      if (groups.length === 0) {
        issues.push({ id: 'no-groups', msg: `${t.name}: no groups defined`, link: '/admin/tournaments/new' });
      } else if (teams.length === 0) {
        issues.push({ id: 'no-teams', msg: `${t.name}: groups exist but no teams assigned`, link: '/admin/teams' });
      } else {
        const totalFixtures = groups.reduce((s, g) => s + Number(g.fixture_count || 0), 0);
        if (totalFixtures === 0) {
          issues.push({ id: 'no-fixtures', msg: `${t.name}: teams exist but no fixtures generated`, link: '/admin/fixtures' });
        }
      }
      return issues;
    });

    Promise.all(fetches)
      .then((all) => setChecks(all.flat()))
      .catch((e) => setError(e.message));
  }, [tournaments]);

  return (
    <WidgetCard title="Setup Health">
      {checks === null && !error && <WidgetLoading />}
      {error && <WidgetError message={error} />}
      {checks !== null && checks.length === 0 && (
        <p style={{ margin: 0, color: 'var(--hj-color-success, #16a34a)', fontSize: 'var(--hj-font-size-sm)', fontWeight: 'var(--hj-font-weight-semibold)' }}>
          ✓ Setup looks good
        </p>
      )}
      {checks !== null && checks.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
          {checks.map((c) => (
            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--hj-font-size-sm)' }}>
              <span style={{ color: '#92400e' }}>⚠ {c.msg}</span>
              <Link to={c.link} style={{ color: 'var(--hj-color-brand-primary)', whiteSpace: 'nowrap', marginLeft: 'var(--hj-space-3)' }}>
                Fix →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

// ── Widget 4: Open / Unscored Games ─────────────────────────────────────────

UnscoredGamesWidget.propTypes = { tournaments: tournamentShape };
UnscoredGamesWidget.defaultProps = { tournaments: null };
function UnscoredGamesWidget({ tournaments }) {
  const [fixtures, setFixtures] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournaments || tournaments.length === 0) { setFixtures([]); return; }

    Promise.all(tournaments.map((t) => getUnscoredFixtures(t.id)))
      .then((results) => {
        const all = results.flatMap((r, i) =>
          r.fixtures.map((f) => ({ ...f, tournamentId: tournaments[i].id }))
        );
        setFixtures(all);
      })
      .catch((e) => setError(e.message));
  }, [tournaments]);

  return (
    <WidgetCard title="Open / Unscored Games">
      {fixtures === null && !error && <WidgetLoading />}
      {error && <WidgetError message={error} />}
      {fixtures !== null && fixtures.length === 0 && (
        <EmptyState>All played fixtures have scores entered.</EmptyState>
      )}
      {fixtures !== null && fixtures.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-2)' }}>
          {fixtures.map((f) => (
            <li key={`${f.tournamentId}-${f.fixture_id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--hj-font-size-sm)' }}>
              <span>
                <span style={{ color: 'var(--hj-color-text-secondary)', marginRight: 'var(--hj-space-2)' }}>
                  {f.date} {f.time}
                </span>
                {f.team1} vs {f.team2}
              </span>
              <Link
                to={`/admin/fixtures?tournamentId=${f.tournamentId}&groupId=${f.group_id}`}
                style={{ color: 'var(--hj-color-brand-primary)', whiteSpace: 'nowrap', marginLeft: 'var(--hj-space-3)' }}
              >
                Enter score →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

// ── Widget 5: Registered Teams & Franchises ──────────────────────────────────

TeamsWidget.propTypes = { tournaments: tournamentShape };
TeamsWidget.defaultProps = { tournaments: null };
function TeamsWidget({ tournaments }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tournaments || tournaments.length === 0) { setStats([]); return; }

    Promise.all(tournaments.map(async (t) => {
      const teams = await getAdminTeams(t.id);
      const franchises = new Set(teams.map((tm) => tm.franchise_name).filter(Boolean));
      return { id: t.id, name: t.name, teamCount: teams.length, franchiseCount: franchises.size };
    }))
      .then(setStats)
      .catch((e) => setError(e.message));
  }, [tournaments]);

  return (
    <WidgetCard title="Registered Teams & Franchises">
      {stats === null && !error && <WidgetLoading />}
      {error && <WidgetError message={error} />}
      {stats !== null && stats.length === 0 && <EmptyState>No live tournaments.</EmptyState>}
      {stats !== null && stats.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-3)' }}>
          {stats.map((s) => (
            <div key={s.id}>
              {stats.length > 1 && (
                <div style={{ fontSize: 'var(--hj-font-size-sm)', fontWeight: 'var(--hj-font-weight-semibold)', marginBottom: 'var(--hj-space-1)' }}>
                  {s.name}
                </div>
              )}
              <div style={{ display: 'flex', gap: 'var(--hj-space-5)' }}>
                <div>
                  <span style={{ fontSize: 'var(--hj-font-size-xl)', fontWeight: 'var(--hj-font-weight-bold)' }}>{s.franchiseCount}</span>
                  <span style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-secondary)', marginLeft: 'var(--hj-space-1)' }}>
                    franchise{s.franchiseCount !== 1 ? 's' : ''}
                  </span>
                  <Link to="/admin/franchises" style={{ display: 'block', fontSize: 'var(--hj-font-size-xs)', color: 'var(--hj-color-brand-primary)' }}>
                    View franchises
                  </Link>
                </div>
                <div>
                  <span style={{ fontSize: 'var(--hj-font-size-xl)', fontWeight: 'var(--hj-font-weight-bold)' }}>{s.teamCount}</span>
                  <span style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-secondary)', marginLeft: 'var(--hj-space-1)' }}>
                    team{s.teamCount !== 1 ? 's' : ''}
                  </span>
                  <Link to="/admin/teams" style={{ display: 'block', fontSize: 'var(--hj-font-size-xs)', color: 'var(--hj-color-brand-primary)' }}>
                    View teams
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [liveTournaments, setLiveTournaments] = useState(null);

  // Fetch live tournaments once; share with widgets that need them
  useEffect(() => {
    getAdminTournaments({ activeOnly: true })
      .then(setLiveTournaments)
      .catch(() => setLiveTournaments([]));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hj-space-6)' }}>
      <h1 style={{ margin: 0 }}>Dashboard</h1>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--hj-space-5)' }}>
        <LiveTournamentsWidget />
        <AnnouncementsWidget />
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--hj-space-5)' }}>
        <SetupHealthWidget tournaments={liveTournaments} />
        <UnscoredGamesWidget tournaments={liveTournaments} />
        <TeamsWidget tournaments={liveTournaments} />
      </div>
    </div>
  );
}
