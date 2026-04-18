import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as api from '../../lib/api';

vi.mock('../../context/TournamentContext', () => ({
  useTournament: () => ({ activeTournament: { id: 't1', name: 'Tournament 1' } }),
}));

vi.mock('../../lib/api', () => ({
  getTournaments: vi.fn(),
}));

const adminFetchMock = vi.fn();
vi.mock('../../lib/adminAuth', () => ({
  adminFetch: (...args) => adminFetchMock(...args),
}));

const mockTournaments = [
  { id: 't1', name: 'Tournament 1' },
  { id: 't2', name: 'Tournament 2' },
];

const mockTeams = [
  { id: 'team1', name: 'Alpha', pool: 'A', group_label: 'U11 Boys', group_id: 'U11B', franchise_name: 'Sharks' },
  { id: 'team2', name: 'Beta', pool: 'A', group_label: 'U11 Boys', group_id: 'U11B', franchise_name: null },
  { id: 'team3', name: 'Gamma', pool: 'B', group_label: 'U13 Girls', group_id: 'U13G', franchise_name: 'Eagles' },
];

describe('AdminTeamsPage', () => {
  beforeEach(() => {
    api.getTournaments.mockResolvedValue(mockTournaments);

    adminFetchMock.mockReset();
    adminFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, data: mockTeams }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the tournament selector', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Tournament')).toBeInTheDocument();
    });
  });

  it('populates tournament dropdown with options', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByText('Tournament 1')).toBeInTheDocument();
      expect(screen.getByText('Tournament 2')).toBeInTheDocument();
    });
  });

  it('defaults to activeTournament on mount', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      const select = screen.getByLabelText('Tournament');
      expect(select.value).toBe('t1');
    });
  });

  it('loads and displays teams grouped by age group', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByText('U11 Boys')).toBeInTheDocument();
      expect(screen.getByText('U13 Girls')).toBeInTheDocument();
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });
  });

  it('displays franchise name for teams that have one', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByText('Sharks')).toBeInTheDocument();
      expect(screen.getByText('Eagles')).toBeInTheDocument();
    });
  });

  it('shows em-dash for teams without a franchise', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      // Beta has no franchise — should show em-dash in franchise column
      const cells = screen.getAllByText('—');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it('shows loading state while fetching teams', async () => {
    adminFetchMock.mockImplementation(() => new Promise(() => {})); // never resolves

    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    // Wait for tournament dropdown to populate, then for loading indicator to appear
    await waitFor(() => screen.getByText('Tournament 1'));
    await waitFor(() => expect(screen.getByText('Loading teams…')).toBeInTheDocument());
  });

  it('shows empty state when no teams are returned', async () => {
    adminFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, data: [] }),
    });

    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No teams found/)).toBeInTheDocument();
    });
  });

  it('shows error state when API fails', async () => {
    adminFetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ ok: false, error: 'DB error' }),
    });

    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load teams: DB error/)).toBeInTheDocument();
    });
  });

  it('reloads teams when tournament selection changes', async () => {
    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    // Wait for initial load
    await waitFor(() => screen.getByText('Alpha'));

    // Change to tournament 2
    const select = screen.getByLabelText('Tournament');
    fireEvent.change(select, { target: { value: 't2' } });

    await waitFor(() => {
      expect(adminFetchMock).toHaveBeenCalledWith(
        expect.stringContaining('tournamentId=t2')
      );
    });
  });

  it('shows error when tournament list fails to load', async () => {
    api.getTournaments.mockRejectedValue(new Error('Network error'));

    const { default: AdminTeamsPage } = await import('./AdminTeamsPage');
    render(<AdminTeamsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load tournaments/)).toBeInTheDocument();
    });
  });
});
