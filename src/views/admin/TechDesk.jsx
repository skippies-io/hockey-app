import React, { useEffect, useReducer, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { adminFetch } from '../../lib/adminAuth';
import { useTournament } from '../../context/TournamentContext';

// ─── reducer ─────────────────────────────────────────────────────────────────

const INITIAL_STATE = { score1: 0, score2: 0, matchEvents: [], isSignedOff: false, coachSignature: null };

function initFromFixture(fixture) {
  return {
    score1: fixture.score1 ?? 0,
    score2: fixture.score2 ?? 0,
    matchEvents: Array.isArray(fixture.match_events) ? fixture.match_events : [],
    isSignedOff: !!fixture.is_signed_off,
    coachSignature: fixture.coach_signature ?? null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return initFromFixture(action.fixture);
    case 'GOAL':
      return {
        ...state,
        score1: action.team === 1 ? state.score1 + 1 : state.score1,
        score2: action.team === 2 ? state.score2 + 1 : state.score2,
        matchEvents: [
          ...state.matchEvents,
          { type: 'goal', team: action.team, minute: action.minute, scorer: action.scorer },
        ],
      };
    case 'REMOVE_EVENT':
      return { ...state, matchEvents: state.matchEvents.filter((_, i) => i !== action.index) };
    case 'ADJUST_SCORE':
      return {
        ...state,
        score1: Math.max(0, state.score1 + (action.team === 1 ? action.delta : 0)),
        score2: Math.max(0, state.score2 + (action.team === 2 ? action.delta : 0)),
      };
    case 'SIGN_OFF':
      return { ...state, isSignedOff: true, coachSignature: action.signature };
    default:
      return state;
  }
}

// ─── sub-components ──────────────────────────────────────────────────────────

function TeamScore({ label, score, team, dispatch, locked }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          aria-label={`Decrease score ${label}`}
          onClick={() => dispatch({ type: 'ADJUST_SCORE', team, delta: -1 })}
          disabled={locked || score <= 0}
          style={{ fontSize: '1.25rem', width: 36, height: 36 }}
        >
          −
        </button>
        <span aria-label={`Score ${label}`} style={{ fontSize: '2rem', minWidth: '2ch', textAlign: 'center' }}>
          {score}
        </span>
        <button
          type="button"
          aria-label={`Increase score ${label}`}
          onClick={() => dispatch({ type: 'ADJUST_SCORE', team, delta: 1 })}
          disabled={locked}
          style={{ fontSize: '1.25rem', width: 36, height: 36 }}
        >
          +
        </button>
      </div>
    </div>
  );
}

TeamScore.propTypes = {
  label: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  team: PropTypes.number.isRequired,
  dispatch: PropTypes.func.isRequired,
  locked: PropTypes.bool,
};

function AddGoalForm({ team1, team2, dispatch, locked }) {
  const [goalTeam, setGoalTeam] = useState(1);
  const [minute, setMinute] = useState('');
  const [scorer, setScorer] = useState('');
  const minuteRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const min = minute.trim() ? Number(minute) : null;
    dispatch({ type: 'GOAL', team: goalTeam, minute: min, scorer: scorer.trim() || null });
    setMinute('');
    setScorer('');
    minuteRef.current?.focus();
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Add goal"
      style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', margin: '0.75rem 0' }}
    >
      <label>
        Team{' '}
        <select
          value={goalTeam}
          onChange={(e) => setGoalTeam(Number(e.target.value))}
          aria-label="Goal team"
          disabled={locked}
        >
          <option value={1}>{team1}</option>
          <option value={2}>{team2}</option>
        </select>
      </label>
      <label>
        Minute{' '}
        <input
          ref={minuteRef}
          type="number"
          min={1}
          max={120}
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          placeholder="—"
          aria-label="Goal minute"
          style={{ width: 60 }}
          disabled={locked}
        />
      </label>
      <label>
        Scorer{' '}
        <input
          value={scorer}
          onChange={(e) => setScorer(e.target.value)}
          placeholder="Name (optional)"
          aria-label="Goal scorer"
          style={{ width: 140 }}
          disabled={locked}
        />
      </label>
      <button type="submit" disabled={locked}>
        Add goal
      </button>
    </form>
  );
}

AddGoalForm.propTypes = {
  team1: PropTypes.string.isRequired,
  team2: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  locked: PropTypes.bool,
};

function EventTimeline({ events, team1, team2, dispatch, locked }) {
  if (!events.length) {
    return <p style={{ color: '#888', margin: '0.5rem 0' }}>No events recorded yet.</p>;
  }
  return (
    <ol aria-label="Match events" style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
      {events.map((ev, i) => (
        <li key={i} style={{ marginBottom: '0.25rem' }}>
          {ev.type === 'goal' ? 'Goal' : ev.type} —{' '}
          {ev.team === 1 ? team1 : team2}
          {ev.minute != null ? ` (${ev.minute}')` : ''}
          {ev.scorer ? ` — ${ev.scorer}` : ''}
          {!locked && (
            <>
              {' '}
              <button
                type="button"
                aria-label={`Remove event ${i + 1}`}
                onClick={() => dispatch({ type: 'REMOVE_EVENT', index: i })}
                style={{ fontSize: '0.75rem', padding: '0 4px' }}
              >
                ✕
              </button>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

EventTimeline.propTypes = {
  events: PropTypes.arrayOf(PropTypes.object).isRequired,
  team1: PropTypes.string.isRequired,
  team2: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  locked: PropTypes.bool,
};

function SignOffForm({ isSignedOff, coachSignature, dispatch, saving }) {
  const [coachName, setCoachName] = useState(coachSignature?.name ?? '');

  if (isSignedOff) {
    return (
      <p
        role="status"
        aria-label="Sign-off status"
        style={{ color: '#15803d', fontWeight: 'bold', margin: '0.5rem 0' }}
      >
        Signed off{coachSignature?.name ? ` by ${coachSignature.name}` : ''}
      </p>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!coachName.trim()) return;
    dispatch({
      type: 'SIGN_OFF',
      signature: { name: coachName.trim(), signed_at: new Date().toISOString() },
    });
  };

  return (
    <form
      onSubmit={submit}
      aria-label="Coach sign-off"
      style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', margin: '0.5rem 0' }}
    >
      <label>
        Coach name{' '}
        <input
          value={coachName}
          onChange={(e) => setCoachName(e.target.value)}
          placeholder="Coach name"
          aria-label="Coach name"
          required
          style={{ width: 180 }}
          disabled={saving}
        />
      </label>
      <button type="submit" disabled={saving || !coachName.trim()}>
        Confirm sign-off
      </button>
    </form>
  );
}

SignOffForm.propTypes = {
  isSignedOff: PropTypes.bool.isRequired,
  coachSignature: PropTypes.shape({ name: PropTypes.string }),
  dispatch: PropTypes.func.isRequired,
  saving: PropTypes.bool,
};

// ─── main component ───────────────────────────────────────────────────────────

export default function TechDesk() {
  const { matchId } = useParams();
  const { activeTournament } = useTournament();
  const tournamentId = activeTournament?.id || '';

  const [fixture, setFixture] = useState(null);
  const [loadingFixture, setLoadingFixture] = useState(false);
  const [err, setErr] = useState('');

  const [liveState, dispatch] = useReducer(reducer, INITIAL_STATE);
  const initialisedFor = useRef(null);

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // ''|'saving'|'saved'|'error'

  // Load fixture
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!tournamentId || !matchId) return;
      setLoadingFixture(true);
      setErr('');
      try {
        const url = `/admin/fixtures?tournamentId=${encodeURIComponent(tournamentId)}&fixtureId=${encodeURIComponent(matchId)}`;
        const res = await adminFetch(url);
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.ok === false) throw new Error(json.error || `HTTP ${res.status}`);
        if (!alive) return;
        setFixture(json.data);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load fixture');
      } finally {
        if (alive) setLoadingFixture(false);
      }
    })();
    return () => { alive = false; };
  }, [tournamentId, matchId]);

  // Initialise reducer once when fixture loads (or reloads for a different matchId)
  useEffect(() => {
    if (fixture && fixture.fixture_id !== initialisedFor.current) {
      initialisedFor.current = fixture.fixture_id;
      dispatch({ type: 'INIT', fixture });
    }
  }, [fixture]);

  const save = async () => {
    if (!tournamentId || !matchId) return;
    setSaving(true);
    setSaveStatus('saving');
    setErr('');
    try {
      const res = await adminFetch('/admin/results', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tournamentId,
          fixture_id: matchId,
          score1: liveState.score1,
          score2: liveState.score2,
          match_events: liveState.matchEvents,
          is_signed_off: liveState.isSignedOff,
          coach_signature: liveState.coachSignature,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || `HTTP ${res.status}`);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('error');
      setErr(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const locked = saving || liveState.isSignedOff;

  // ─── render guards ───

  if (!tournamentId) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Tech Desk</h1>
        <div role="alert">No active tournament. Select one first.</div>
      </div>
    );
  }

  if (!matchId) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Tech Desk</h1>
        <div role="alert">No match ID provided in URL.</div>
      </div>
    );
  }

  if (loadingFixture) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Tech Desk</h1>
        <span>Loading…</span>
      </div>
    );
  }

  if (err && !fixture) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Tech Desk</h1>
        <div role="alert">{err}</div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div style={{ padding: '1rem' }}>
        <h1>Tech Desk</h1>
        <div role="alert">Fixture not found.</div>
      </div>
    );
  }

  // ─── main render ───

  return (
    <div style={{ padding: '1rem', maxWidth: 640 }}>
      <h1>Tech Desk</h1>
      <p style={{ color: '#666', margin: '0.25rem 0 0.75rem' }}>
        {fixture.date} {fixture.time}
        {fixture.venue ? ` — ${fixture.venue}` : ''}
        {fixture.pool ? ` · Pool ${fixture.pool}` : ''}
        {fixture.round ? ` · ${fixture.round}` : ''}
      </p>

      {err && (
        <div role="alert" style={{ padding: '0.75rem', border: '1px solid #cc0000', marginBottom: '0.75rem' }}>
          {err}
        </div>
      )}

      {liveState.isSignedOff && (
        <div
          role="status"
          aria-label="Match locked"
          style={{
            padding: '0.5rem 0.75rem',
            background: '#f0fdf4',
            border: '1px solid #16a34a',
            color: '#15803d',
            marginBottom: '0.75rem',
          }}
        >
          Match signed off — result is locked.
        </div>
      )}

      <section aria-label="Live score">
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', margin: '1rem 0' }}>
          <TeamScore
            label={fixture.team1}
            score={liveState.score1}
            team={1}
            dispatch={dispatch}
            locked={locked}
          />
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>–</span>
          <TeamScore
            label={fixture.team2}
            score={liveState.score2}
            team={2}
            dispatch={dispatch}
            locked={locked}
          />
        </div>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Events</h2>
        <EventTimeline
          events={liveState.matchEvents}
          team1={fixture.team1}
          team2={fixture.team2}
          dispatch={dispatch}
          locked={locked}
        />
        {!liveState.isSignedOff && (
          <AddGoalForm
            team1={fixture.team1}
            team2={fixture.team2}
            dispatch={dispatch}
            locked={saving}
          />
        )}
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Coach Sign-off</h2>
        <SignOffForm
          isSignedOff={liveState.isSignedOff}
          coachSignature={liveState.coachSignature}
          dispatch={dispatch}
          saving={saving}
        />
      </section>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button type="button" onClick={save} disabled={saving} aria-label="Save result">
          {saving ? 'Saving…' : 'Save result'}
        </button>
        {saveStatus === 'saved' && <span role="status">Saved</span>}
        {saveStatus === 'error' && <span role="status">Error saving</span>}
      </div>
    </div>
  );
}
