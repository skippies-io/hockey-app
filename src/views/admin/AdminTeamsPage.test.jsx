import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import * as api from '../../lib/api';
import AdminTeamsPage from './AdminTeamsPage';

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
  { id: 'team1', name: 'Alpha', pool: 'A', group_label: 'U11 Boys', group_id: 'U11B', franchise_name: 'Sharks', franchise_dir_id: 'fd1' },
  { id: 'team2', name: 'Beta', pool: 'A', group_label: 'U11 Boys', group_id: 'U11B', franchise_name: null, franchise_dir_id: null },
  { id: 'team3', name: 'Gamma', pool: 'B', group_label: 'U13 Girls', group_id: 'U13G', franchise_name: 'Eagles', franchise_dir_id: 'fd2' },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/teams']}>
      <AdminTeamsPage />
    </MemoryRouter>
  );
}

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
    await renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Tournament')).toBeInTheDocument();
    });
  });

  it('renders the division selector', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Division')).toBeInTheDocument();
    });
  });

  it('populates tournament dropdown with options', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tournament 1')).toBeInTheDocument();
      expect(screen.getByText('Tournament 2')).toBeInTheDocument();
    });
  });

  it('defaults to activeTournament on mount', async () => {
    await renderPage();
    await waitFor(() => {
      const select = screen.getByLabelText('Tournament');
      expect(select.value).toBe('t1');
    });
  });

  it('loads and displays teams grouped by age group', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('U11 Boys').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('U13 Girls').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });
  });

  it('populates division dropdown from loaded teams', async () => {
    await renderPage();
    await waitFor(() => {
      const divSelect = screen.getByLabelText('Division');
      const options = [...divSelect.options].map((o) => o.value);
      expect(options).toContain('U11 Boys');
      expect(options).toContain('U13 Girls');
    });
  });

  it('filters teams by selected division', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Alpha'));

    fireEvent.change(screen.getByLabelText('Division'), { target: { value: 'U11 Boys' } });

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
  });

  it('shows all teams when division filter is cleared', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Alpha'));

    fireEvent.change(screen.getByLabelText('Division'), { target: { value: 'U11 Boys' } });
    fireEvent.change(screen.getByLabelText('Division'), { target: { value: '' } });

    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('displays franchise name for teams that have one', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sharks')).toBeInTheDocument();
      expect(screen.getByText('Eagles')).toBeInTheDocument();
    });
  });

  it('shows em-dash for teams without a franchise', async () => {
    await renderPage();
    await waitFor(() => {
      const cells = screen.getAllByText('—');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  it('franchise name is a link when franchise_dir_id is present', async () => {
    await renderPage();
    await waitFor(() => {
      const sharksLink = screen.getByRole('link', { name: 'Sharks' });
      expect(sharksLink).toHaveAttribute('href', '/admin/franchises/fd1');
    });
  });

  it('franchise name is plain text when franchise_dir_id is absent', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Alpha'));
    // Beta has no franchise_dir_id — franchise cell shows '—', not a link
    const links = screen.getAllByRole('link');
    const franchiseLinks = links.filter((l) => l.getAttribute('href')?.startsWith('/admin/franchises'));
    expect(franchiseLinks.every((l) => l.textContent !== '—')).toBe(true);
  });

  it('team name is a link to the public team profile', async () => {
    await renderPage();
    await waitFor(() => {
      const alphaLink = screen.getByRole('link', { name: 'Alpha' });
      expect(alphaLink.getAttribute('href')).toContain('Alpha');
    });
  });

  it('shows loading state while fetching teams', async () => {
    adminFetchMock.mockImplementation(() => new Promise(() => {}));

    await renderPage();

    await waitFor(() => screen.getByText('Tournament 1'));
    await waitFor(() => expect(screen.getByText('Loading teams…')).toBeInTheDocument());
  });

  it('shows empty state when no teams are returned', async () => {
    adminFetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, data: [] }),
    });

    await renderPage();

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

    await renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load teams: DB error/)).toBeInTheDocument();
    });
  });

  it('reloads teams when tournament selection changes', async () => {
    await renderPage();

    await waitFor(() => screen.getByText('Alpha'));

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

    await renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load tournaments/)).toBeInTheDocument();
    });
  });
});
