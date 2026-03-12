import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('../../context/TournamentContext', () => ({
  useTournament: () => ({ activeTournament: { id: 't1', name: 'T1' } }),
}));

vi.mock('../../lib/api', () => ({
  getGroups: vi.fn(async () => ([{ id: 'U11B', label: 'U11 Boys' }])),
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

  // Note: we intentionally do not unit test the 1200ms UI timeout; it is a presentational detail.
});
