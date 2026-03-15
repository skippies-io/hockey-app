import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ matchId: 'fx1' }),
}));

vi.mock('../../context/TournamentContext', () => ({
  useTournament: () => ({ activeTournament: { id: 't1', name: 'T1' } }),
}));

const adminFetchMock = vi.fn();
vi.mock('../../lib/adminAuth', () => ({
  adminFetch: (...args) => adminFetchMock(...args),
}));

const FIXTURE = {
  fixture_id: 'fx1',
  date: '2026-01-15',
  time: '10:00',
  venue: 'Rink A',
  pool: 'A',
  round: 'Prelim',
  team1: 'Eagles',
  team2: 'Hawks',
  score1: null,
  score2: null,
  match_events: [],
  is_signed_off: false,
  coach_signature: null,
};

function fixtureResponse(overrides = {}) {
  return {
    ok: true,
    json: () => Promise.resolve({ ok: true, data: { ...FIXTURE, ...overrides } }),
  };
}

function saveOkResponse() {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        ok: true,
        data: { fixture_id: 'fx1', score1: 2, score2: 1, match_events: [], is_signed_off: false },
      }),
  };
}

describe('TechDesk', () => {
  beforeEach(() => {
    adminFetchMock.mockReset();
    // Default: fixture load + save both succeed
    adminFetchMock.mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.includes('/admin/fixtures')) {
        return Promise.resolve(fixtureResponse());
      }
      if (typeof url === 'string' && url === '/admin/results' && opts?.method === 'PUT') {
        return Promise.resolve(saveOkResponse());
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders fixture info after loading', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Score Eagles')).toBeDefined();
    });

    expect(screen.getByLabelText('Score Hawks')).toBeDefined();
    expect(screen.getByText(/2026-01-15/)).toBeDefined();
    expect(screen.getByText(/Rink A/)).toBeDefined();
  });

  it('shows loading state then renders', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    // Loading appears initially
    expect(screen.getByText('Loading…')).toBeDefined();

    await waitFor(() => {
      expect(screen.queryByText('Loading…')).toBeNull();
    });
  });

  it('shows error when fixture load fails', async () => {
    adminFetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ ok: false, error: 'db_error' }),
      })
    );

    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText(/db_error/i)).toBeDefined();
  });

  it('increments team1 score with + button', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Score Eagles')).toBeDefined();
    });

    const increaseBtn = screen.getByLabelText('Increase score Eagles');
    fireEvent.click(increaseBtn);

    expect(screen.getByLabelText('Score Eagles').textContent).toBe('1');
    expect(screen.getByLabelText('Score Hawks').textContent).toBe('0');
  });

  it('decrements team2 score with − button (floor at 0)', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Decrease score Hawks')).toBeDefined();
    });

    // Increase then decrease
    fireEvent.click(screen.getByLabelText('Increase score Hawks'));
    fireEvent.click(screen.getByLabelText('Decrease score Hawks'));
    fireEvent.click(screen.getByLabelText('Decrease score Hawks')); // no-op below 0

    expect(screen.getByLabelText('Score Hawks').textContent).toBe('0');
  });

  it('adds a goal event and bumps score', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add goal')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Goal minute'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Goal scorer'), { target: { value: 'Jones' } });
    fireEvent.submit(screen.getByLabelText('Add goal'));

    expect(screen.getByLabelText('Score Eagles').textContent).toBe('1');
    expect(screen.getByText(/Goal — Eagles \(12'\) — Jones/)).toBeDefined();
  });

  it('removes an event when ✕ is clicked', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add goal')).toBeDefined();
    });

    fireEvent.submit(screen.getByLabelText('Add goal'));
    expect(screen.getByRole('list', { name: 'Match events' }).querySelector('li')).toBeDefined();

    fireEvent.click(screen.getByLabelText('Remove event 1'));
    expect(screen.getByText(/No events recorded/)).toBeDefined();
  });

  it('signs off and locks score editing', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Coach sign-off')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Coach name'), { target: { value: 'Smith' } });
    fireEvent.submit(screen.getByLabelText('Coach sign-off'));

    await waitFor(() => {
      expect(screen.getByLabelText('Match locked')).toBeDefined();
    });

    expect(screen.getByLabelText('Increase score Eagles')).toHaveProperty('disabled', true);
    expect(screen.getByText(/Signed off by Smith/)).toBeDefined();
  });

  it('saves result with correct payload', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Score Eagles')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Increase score Eagles'));
    fireEvent.click(screen.getByLabelText('Increase score Eagles'));
    fireEvent.click(screen.getByLabelText('Increase score Hawks'));

    fireEvent.click(screen.getByLabelText('Save result'));

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith(
        '/admin/results',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    const call = adminFetchMock.mock.calls.find((c) => c[0] === '/admin/results');
    const payload = JSON.parse(call[1].body);
    expect(payload.tournament_id).toBe('t1');
    expect(payload.fixture_id).toBe('fx1');
    expect(payload.score1).toBe(2);
    expect(payload.score2).toBe(1);
    expect(Array.isArray(payload.match_events)).toBe(true);
  });

  it('shows "Saved" status after successful save', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Save result')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Save result'));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeDefined();
    });
  });

  it('shows error status when save fails', async () => {
    // First call = fixture load (ok), second call = save (fail)
    adminFetchMock
      .mockImplementationOnce(() => Promise.resolve(fixtureResponse()))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ ok: false, error: 'invalid_scores' }),
        })
      );

    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Save result')).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText('Save result'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText(/invalid_scores/i)).toBeDefined();
    expect(screen.getByText(/Error saving/)).toBeDefined();
  });

  it('loads pre-existing scores and events from fixture', async () => {
    adminFetchMock.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/admin/fixtures')) {
        return Promise.resolve(
          fixtureResponse({
            score1: 3,
            score2: 1,
            match_events: [{ type: 'goal', team: 1, minute: 5, scorer: 'Ali' }],
          })
        );
      }
      return Promise.resolve(saveOkResponse());
    });

    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Score Eagles').textContent).toBe('3');
    });
    expect(screen.getByLabelText('Score Hawks').textContent).toBe('1');
    expect(screen.getByText(/Goal — Eagles \(5'\) — Ali/)).toBeDefined();
  });

  it('includes match_events in save payload after adding goal', async () => {
    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add goal')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Goal minute'), { target: { value: '7' } });
    fireEvent.submit(screen.getByLabelText('Add goal'));

    fireEvent.click(screen.getByLabelText('Save result'));

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith('/admin/results', expect.objectContaining({ method: 'PUT' }));
    });

    const call = adminFetchMock.mock.calls.find((c) => c[0] === '/admin/results');
    const payload = JSON.parse(call[1].body);
    expect(payload.match_events).toHaveLength(1);
    expect(payload.match_events[0].minute).toBe(7);
    expect(payload.match_events[0].team).toBe(1);
  });

});

describe('TechDesk — no active tournament', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders alert when no active tournament', async () => {
    vi.doMock('react-router-dom', () => ({ useParams: () => ({ matchId: 'fx1' }) }));
    vi.doMock('../../context/TournamentContext', () => ({
      useTournament: () => ({ activeTournament: null }),
    }));
    vi.doMock('../../lib/adminAuth', () => ({ adminFetch: vi.fn() }));

    const { default: TechDesk } = await import('./TechDesk');
    render(<TechDesk />);

    expect(screen.getByRole('alert').textContent).toMatch(/no active tournament/i);
  });
});
