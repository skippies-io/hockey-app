import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    // First call: load fixtures
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
});
