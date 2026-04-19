import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import * as tournamentApi from '../../lib/tournamentApi';

vi.mock('../../lib/tournamentApi');

const liveTournaments = [
  { id: 't1', name: 'Spring Cup', season: '2024-25', is_active: true },
];

const activeAnnouncement = {
  id: 'a1',
  title: 'Ice resurfacing at 10am',
  severity: 'info',
  is_published: true,
  expires_at: null,
};

const expiredAnnouncement = {
  id: 'a2',
  title: 'Old notice',
  severity: 'warning',
  is_published: true,
  expires_at: new Date(Date.now() - 1000).toISOString(),
};

const unpublishedAnnouncement = {
  id: 'a3',
  title: 'Draft',
  severity: 'info',
  is_published: false,
  expires_at: null,
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tournamentApi.getAdminTournaments.mockResolvedValue(liveTournaments);
    tournamentApi.getAdminAnnouncements.mockResolvedValue([activeAnnouncement]);
    tournamentApi.getAdminGroups.mockResolvedValue([
      { id: 'g1', label: 'U9', team_count: '4', fixture_count: '6' },
    ]);
    tournamentApi.getAdminTeams.mockResolvedValue([
      { id: 'tm1', name: 'Alpha U9', franchise_name: 'Alpha FC' },
      { id: 'tm2', name: 'Beta U9', franchise_name: 'Beta FC' },
    ]);
    tournamentApi.getUnscoredFixtures.mockResolvedValue({ fixtures: [], serverTime: new Date().toISOString() });
  });

  it('renders the Dashboard heading', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
  });

  // Widget 1
  it('shows live tournament name', async () => {
    renderDashboard();
    expect(await screen.findByText('Spring Cup')).toBeInTheDocument();
  });

  it('shows empty state when no live tournaments', async () => {
    tournamentApi.getAdminTournaments.mockResolvedValue([]);
    renderDashboard();
    expect(await screen.findByText(/No live tournaments/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Tournaments' })).toBeInTheDocument();
  });

  it('shows widget error when live tournaments fetch fails', async () => {
    tournamentApi.getAdminTournaments.mockRejectedValue(new Error('Network error'));
    renderDashboard();
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  // Widget 2
  it('shows published non-expired announcement', async () => {
    renderDashboard();
    expect(await screen.findByText('Ice resurfacing at 10am')).toBeInTheDocument();
  });

  it('filters out expired and unpublished announcements', async () => {
    tournamentApi.getAdminAnnouncements.mockResolvedValue([
      activeAnnouncement,
      expiredAnnouncement,
      unpublishedAnnouncement,
    ]);
    renderDashboard();
    await screen.findByText('Ice resurfacing at 10am');
    expect(screen.queryByText('Old notice')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('shows empty state when no active announcements', async () => {
    tournamentApi.getAdminAnnouncements.mockResolvedValue([expiredAnnouncement]);
    renderDashboard();
    expect(await screen.findByText('No active announcements.')).toBeInTheDocument();
  });

  it('shows announcements widget error on fetch failure', async () => {
    tournamentApi.getAdminAnnouncements.mockRejectedValue(new Error('Ann error'));
    renderDashboard();
    expect(await screen.findByText('Ann error')).toBeInTheDocument();
  });

  // Widget 3
  it('shows Setup looks good when no issues', async () => {
    renderDashboard();
    expect(await screen.findByText(/Setup looks good/)).toBeInTheDocument();
  });

  it('shows warning when no groups exist', async () => {
    tournamentApi.getAdminGroups.mockResolvedValue([]);
    tournamentApi.getAdminTeams.mockResolvedValue([]);
    renderDashboard();
    expect(await screen.findByText(/no groups defined/)).toBeInTheDocument();
  });

  it('shows warning when groups exist but no teams', async () => {
    tournamentApi.getAdminGroups.mockResolvedValue([
      { id: 'g1', label: 'U9', team_count: '0', fixture_count: '0' },
    ]);
    tournamentApi.getAdminTeams.mockResolvedValue([]);
    renderDashboard();
    expect(await screen.findByText(/no teams assigned/)).toBeInTheDocument();
  });

  it('shows warning when teams exist but no fixtures', async () => {
    tournamentApi.getAdminGroups.mockResolvedValue([
      { id: 'g1', label: 'U9', team_count: '2', fixture_count: '0' },
    ]);
    renderDashboard();
    expect(await screen.findByText(/no fixtures generated/)).toBeInTheDocument();
  });

  // Widget 4
  it('shows all-scored empty state when no unscored fixtures', async () => {
    renderDashboard();
    expect(await screen.findByText('All played fixtures have scores entered.')).toBeInTheDocument();
  });

  it('shows unscored fixture with team names', async () => {
    tournamentApi.getUnscoredFixtures.mockResolvedValue({
      fixtures: [{ fixture_id: 'f1', group_id: 'g1', date: '2024-03-01', time: '10:00', team1: 'Alpha', team2: 'Beta' }],
      serverTime: new Date().toISOString(),
    });
    renderDashboard();
    expect(await screen.findByText(/Alpha vs Beta/)).toBeInTheDocument();
  });

  // Widget 5
  it('shows team and franchise counts', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText('franchises')).toBeInTheDocument();
    expect(screen.getByText('teams')).toBeInTheDocument();
  });

  it('shows no live tournaments state in teams widget when none active', async () => {
    tournamentApi.getAdminTournaments.mockResolvedValue([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getAllByText('No live tournaments.').length).toBeGreaterThan(0);
    });
  });
});
