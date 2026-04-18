import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { isOverdue } from '../../lib/fixtureOverdue';

vi.mock('../../context/TournamentContext', () => ({
  useTournament: () => ({ activeTournament: { id: 't1', name: 'T1' } }),
}));

vi.mock('../../lib/api', () => ({
  getGroups: vi.fn(async () => ([{ id: 'U11B', label: 'U11 Boys' }])),
  getTournaments: vi.fn(async () => ([
    { id: 't1', name: 'T1' },
    { id: 't2', name: 'T2' },
  ])),
}));

const adminFetchMock = vi.fn();
vi.mock('../../lib/adminAuth', () => ({
  adminFetch: (...args) => adminFetchMock(...args),
}));

describe('FixturesPage', () => {
  beforeEach(() => {
    adminFetchMock.mockReset();
    adminFetchMock.mockImplementation((url, opts) => {
      if (typeof url === 'string' && url.startsWith('/admin/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            data: [
              { fixture_id: 'fx1', date: '2026-01-01', time: '09:00', team1: 'A', team2: 'B', score1: null, score2: null },
            ],
          }),
        });
      }
      if (typeof url === 'string' && url === '/admin/results' && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: { fixture_id: 'fx1', score1: 2, score2: 1 } }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders fixtures and allows saving a score', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => {
      expect(screen.getByText(/A vs B/)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Score1 fx1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Score2 fx1'), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith(
        '/admin/results',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('shows an error when fixtures load fails', async () => {
    adminFetchMock.mockImplementationOnce(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ ok: false, error: 'boom' }),
    }));

    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText(/boom/i)).toBeDefined();
  });

  it('shows an error when save fails', async () => {
    // fixtures load ok first
    adminFetchMock.mockImplementationOnce((url) => {
      if (String(url).startsWith('/admin/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            data: [
              { fixture_id: 'fx1', date: '2026-01-01', time: '09:00', team1: 'A', team2: 'B', score1: null, score2: null },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    // save fails
    adminFetchMock.mockImplementationOnce((url) => {
      if (url === '/admin/results') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ ok: false, error: 'bad_scores' }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => {
      expect(screen.getByText(/A vs B/)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Score1 fx1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Score2 fx1'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
    expect(screen.getByText(/bad_scores/i)).toBeDefined();
  });

  it('sends null scores when fields are blank (clear result)', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => {
      expect(screen.getByText(/A vs B/)).toBeDefined();
    });

    // blank values
    fireEvent.change(screen.getByLabelText('Score1 fx1'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Score2 fx1'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith(
        '/admin/results',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    const call = adminFetchMock.mock.calls.find((c) => c[0] === '/admin/results');
    expect(call).toBeTruthy();
    const opts = call[1];
    const parsed = JSON.parse(opts.body);
    expect(parsed.score1).toBeNull();
    expect(parsed.score2).toBeNull();
  });

  it('shows overdue banner for fixtures >60 min past with no scores', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // Set "now" to 12:00; fixture at 09:00 (3h ago) with no scores → overdue
    vi.setSystemTime(new Date('2026-03-15T12:00:00'));
    adminFetchMock.mockImplementationOnce((url) => {
      if (String(url).startsWith('/admin/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            data: [{ fixture_id: 'fx_od', date: '2026-03-15', time: '09:00', team1: 'X', team2: 'Y', score1: null, score2: null }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => screen.getByLabelText('Overdue fixtures'), { timeout: 3000 });
    expect(screen.getByLabelText('Overdue fixtures')).toBeDefined();
    vi.useRealTimers();
  });

  it('does not show overdue banner when scored fixtures exist', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-15T12:00:00'));
    adminFetchMock.mockImplementationOnce((url) => {
      if (String(url).startsWith('/admin/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            // 09:00 → overdue time, but has scores → not flagged
            data: [{ fixture_id: 'fx_sc', date: '2026-03-15', time: '09:00', team1: 'P', team2: 'Q', score1: 2, score2: 1 }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => screen.getByText(/P vs Q/));
    expect(screen.queryByLabelText('Overdue fixtures')).toBeNull();
    vi.useRealTimers();
  });

  it('renders alert status dropdown and alert message input', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => screen.getByText(/A vs B/));

    expect(screen.getByLabelText('Alert status fx1')).toBeDefined();
    expect(screen.getByLabelText('Alert message fx1')).toBeDefined();
  });

  it('save payload includes alert_status and alert_message', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => screen.getByText(/A vs B/));

    fireEvent.change(screen.getByLabelText('Alert status fx1'), { target: { value: 'Postponed' } });
    fireEvent.change(screen.getByLabelText('Alert message fx1'), { target: { value: 'Rink flooded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith('/admin/results', expect.objectContaining({ method: 'PUT' }));
    });

    const call = adminFetchMock.mock.calls.find((c) => c[0] === '/admin/results');
    const parsed = JSON.parse(call[1].body);
    expect(parsed.alert_status).toBe('Postponed');
    expect(parsed.alert_message).toBe('Rink flooded');
  });

  it('pre-populates alert fields from loaded fixture data', async () => {
    adminFetchMock.mockImplementationOnce((url) => {
      if (String(url).startsWith('/admin/fixtures')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            ok: true,
            data: [{
              fixture_id: 'fx2', date: '2026-01-02', time: '10:00',
              team1: 'C', team2: 'D', score1: null, score2: null,
              result_status: 'Delayed', alert_message: 'Start pushed back',
            }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => screen.getByText(/C vs D/));

    expect(screen.getByLabelText('Alert status fx2').value).toBe('Delayed');
    expect(screen.getByLabelText('Alert message fx2').value).toBe('Start pushed back');
  });

  it('renders tournament selector with options', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => {
      const select = screen.getByLabelText('Tournament');
      expect(select).toBeDefined();
    });

    expect(screen.getByText('T1')).toBeDefined();
    expect(screen.getByText('T2')).toBeDefined();
  });

  it('defaults tournament selector to activeTournament', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    await waitFor(() => {
      const select = screen.getByLabelText('Tournament');
      expect(select.value).toBe('t1');
    });
  });

  it('resets group selector when tournament changes', async () => {
    const { default: FixturesPage } = await import('./FixturesPage');
    render(<FixturesPage />);

    // Wait for initial groups to load
    await waitFor(() => screen.getByText(/A vs B/));

    const groupSelect = screen.getByLabelText('Group');
    expect(groupSelect.value).toBe('U11B');

    // Change tournament
    fireEvent.change(screen.getByLabelText('Tournament'), { target: { value: 't2' } });

    // Group should reset
    await waitFor(() => {
      expect(screen.getByLabelText('Group').value).toBe('');
    });
  });

  // Note: we intentionally do not unit test the 1200ms UI timeout; it is a presentational detail.
});

describe('isOverdue', () => {
  const now = new Date('2026-03-15T12:00:00').getTime();

  it('returns false when scores are present', () => {
    expect(isOverdue({ date: '2026-03-15', time: '09:00', score1: '2', score2: '1' }, now)).toBe(false);
    expect(isOverdue({ date: '2026-03-15', time: '09:00', score1: '0', score2: null }, now)).toBe(false);
  });

  it('returns false when fixture is recent (within 60 min)', () => {
    // 30 minutes ago — not overdue
    expect(isOverdue({ date: '2026-03-15', time: '11:30', score1: '', score2: '' }, now)).toBe(false);
  });

  it('returns true when fixture is >60 min ago with no scores', () => {
    // 2 hours ago
    expect(isOverdue({ date: '2026-03-15', time: '10:00', score1: '', score2: '' }, now)).toBe(true);
  });

  it('returns false for future fixtures', () => {
    expect(isOverdue({ date: '2026-03-15', time: '14:00', score1: '', score2: '' }, now)).toBe(false);
  });

  it('returns false when time is TBD', () => {
    expect(isOverdue({ date: '2026-03-15', time: 'TBD', score1: '', score2: '' }, now)).toBe(false);
  });

  it('returns false when date or time is missing', () => {
    expect(isOverdue({ date: '', time: '09:00', score1: '', score2: '' }, now)).toBe(false);
    expect(isOverdue({ date: '2026-03-15', time: '', score1: '', score2: '' }, now)).toBe(false);
  });
});

