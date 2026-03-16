import React, { useEffect, useMemo, useState } from 'react';
import { getGroups } from '../../lib/api';
import { adminFetch } from '../../lib/adminAuth';
import { useTournament } from '../../context/TournamentContext';
import { isOverdue } from '../../lib/fixtureOverdue';

const ALERT_STATUSES = ['', 'Postponed', 'Cancelled', 'Delayed', 'TBC'];

function normaliseScoreInput(value) {
  if (value === '' || value == null) return '';
  return String(value);
}

export default function FixturesPage() {
  const { activeTournament } = useTournament();
  const tournamentId = activeTournament?.id || '';

  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [err, setErr] = useState('');
  const [saveState, setSaveState] = useState({}); // fixture_id -> 'saving'|'saved'|'error'

  const groupOptions = useMemo(
    () => (groups || []).filter((g) => g?.id && g.id !== 'all'),
    [groups]
  );

  const overdueCount = useMemo(
    () => fixtures.filter((f) => isOverdue(f)).length,
    [fixtures]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr('');
      setLoadingGroups(true);
      try {
        if (!tournamentId) {
          setGroups([]);
          return;
        }
        const list = await getGroups(tournamentId);
        if (!alive) return;
        setGroups(list);
        if (!groupId && list?.[0]?.id) setGroupId(list[0].id);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load groups');
      } finally {
        if (alive) setLoadingGroups(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setErr('');
      setLoadingFixtures(true);
      try {
        if (!tournamentId || !groupId) {
          setFixtures([]);
          return;
        }
        const url = `/admin/fixtures?tournamentId=${encodeURIComponent(tournamentId)}&groupId=${encodeURIComponent(groupId)}`;
        const res = await adminFetch(url);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        if (!alive) return;
        const rows = (json.data || []).map((r) => ({
          ...r,
          score1: normaliseScoreInput(r.score1),
          score2: normaliseScoreInput(r.score2),
          alert_status: r.result_status || '',
          alert_message: r.alert_message || '',
        }));
        setFixtures(rows);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load fixtures');
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tournamentId, groupId]);

  const updateField = (fixtureId, key, value) => {
    setFixtures((prev) =>
      prev.map((f) => (f.fixture_id === fixtureId ? { ...f, [key]: value } : f))
    );
  };

  const saveRow = async (row) => {
    const fixtureId = row.fixture_id;
    setSaveState((s) => ({ ...s, [fixtureId]: 'saving' }));
    setErr('');

    try {
      const payload = {
        tournament_id: tournamentId,
        fixture_id: fixtureId,
        score1: row.score1 === '' ? null : Number(row.score1),
        score2: row.score2 === '' ? null : Number(row.score2),
        alert_status: row.alert_status || '',
        alert_message: row.alert_message || '',
      };

      const res = await adminFetch('/admin/results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setSaveState((s) => ({ ...s, [fixtureId]: 'saved' }));
      setTimeout(() => {
        setSaveState((s) => ({ ...s, [fixtureId]: '' }));
      }, 1200);
    } catch (e) {
      setSaveState((s) => ({ ...s, [fixtureId]: 'error' }));
      setErr(e?.message || 'Failed to save');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Fixtures & Results</h1>
      <p>Enter final scores and set alerts for fixtures (admin-only).</p>

      {!tournamentId && (
        <div role="alert" style={{ padding: '0.75rem', border: '1px solid #ccc' }}>
          Select a tournament first (no active tournament found).
        </div>
      )}

      {err && (
        <div role="alert" style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #cc0000' }}>
          {err}
        </div>
      )}

      {overdueCount > 0 && (
        <div
          role="alert"
          aria-label="Overdue fixtures"
          style={{ marginTop: '0.75rem', padding: '0.75rem', border: '1px solid #b45309', background: '#fef3c7', color: '#92400e' }}
        >
          ⚠ {overdueCount} fixture{overdueCount > 1 ? 's' : ''} overdue — score{overdueCount > 1 ? 's' : ''} missing
        </div>
      )}

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label>
          Group:{' '}
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            disabled={loadingGroups || !tournamentId}
            aria-label="Group"
          >
            <option value="">Select group</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label || g.id}
              </option>
            ))}
          </select>
        </label>

        {(loadingGroups || loadingFixtures) && <span>Loading…</span>}
      </div>

      <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Date</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Time</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Fixture</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Score</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Alert</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '0.5rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.length === 0 && !loadingFixtures && (
              <tr>
                <td colSpan={6} style={{ padding: '0.75rem', color: '#666' }}>
                  No fixtures found.
                </td>
              </tr>
            )}

            {fixtures.map((row) => {
              const saving = saveState[row.fixture_id] || '';
              const disabled = saving === 'saving' || !tournamentId;
              const overdue = isOverdue(row);
              const hasAlert = !!row.alert_status;

              return (
                <tr
                  key={row.fixture_id}
                  data-overdue={overdue ? 'true' : undefined}
                  style={overdue ? { background: '#fef9c3' } : hasAlert ? { background: '#fff7ed' } : undefined}
                >
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{row.date}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>{row.time}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    {row.team1} vs {row.team2}
                    {overdue && (
                      <span
                        aria-label="Overdue"
                        style={{ marginLeft: '0.5rem', fontSize: '11px', color: '#92400e', fontWeight: 600 }}
                      >
                        OVERDUE
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    <input
                      aria-label={`Score1 ${row.fixture_id}`}
                      value={row.score1}
                      onChange={(e) => updateField(row.fixture_id, 'score1', e.target.value)}
                      inputMode="numeric"
                      style={{ width: 60 }}
                      disabled={disabled}
                    />
                    {' - '}
                    <input
                      aria-label={`Score2 ${row.fixture_id}`}
                      value={row.score2}
                      onChange={(e) => updateField(row.fixture_id, 'score2', e.target.value)}
                      inputMode="numeric"
                      style={{ width: 60 }}
                      disabled={disabled}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    <select
                      aria-label={`Alert status ${row.fixture_id}`}
                      value={row.alert_status}
                      onChange={(e) => updateField(row.fixture_id, 'alert_status', e.target.value)}
                      disabled={disabled}
                      style={{ marginRight: '0.25rem' }}
                    >
                      {ALERT_STATUSES.map((s) => (
                        <option key={s} value={s}>{s || '—'}</option>
                      ))}
                    </select>
                    <input
                      aria-label={`Alert message ${row.fixture_id}`}
                      value={row.alert_message}
                      onChange={(e) => updateField(row.fixture_id, 'alert_message', e.target.value)}
                      placeholder="Message (optional)"
                      style={{ width: 180 }}
                      disabled={disabled}
                    />
                  </td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #f0f0f0' }}>
                    <button type="button" onClick={() => saveRow(row)} disabled={disabled}>
                      {saving === 'saving' ? 'Saving…' : 'Save'}
                    </button>
                    {saving === 'saved' && <span style={{ marginLeft: '0.5rem' }}>Saved</span>}
                    {saving === 'error' && <span style={{ marginLeft: '0.5rem' }}>Error</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
