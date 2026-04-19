import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminTournamentsPage from './AdminTournamentsPage';
import * as tournamentApi from '../../lib/tournamentApi';

vi.mock('../../lib/tournamentApi');

const mockTournaments = [
  { id: 't1', name: 'Spring Cup', season: '2024-25', is_active: true, logo_url: null },
  { id: 't2', name: 'Fall Classic', season: '2023-24', is_active: false, logo_url: null },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/tournaments']}>
      <Routes>
        <Route path="/admin/tournaments" element={<AdminTournamentsPage />} />
        <Route path="/admin/tournaments/new" element={<div>Create wizard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminTournamentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tournamentApi.getAdminTournaments.mockResolvedValue(mockTournaments);
  });

  it('renders tournament list', async () => {
    renderPage();
    expect(await screen.findByText('Spring Cup')).toBeInTheDocument();
    expect(screen.getByText('Fall Classic')).toBeInTheDocument();
  });

  it('shows Live for active and Inactive for inactive tournaments', async () => {
    renderPage();
    await screen.findByText('Spring Cup');
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('active tournament checkbox is checked, inactive is unchecked', async () => {
    renderPage();
    await screen.findByText('Spring Cup');
    const [springCheckbox, fallCheckbox] = screen.getAllByRole('switch');
    expect(springCheckbox).toBeChecked();
    expect(fallCheckbox).not.toBeChecked();
  });

  it('toggling active tournament deactivates it (optimistic)', async () => {
    tournamentApi.setTournamentActive.mockResolvedValue({ ...mockTournaments[0], is_active: false });
    renderPage();
    await screen.findByText('Spring Cup');

    const [springCheckbox] = screen.getAllByRole('switch');
    fireEvent.click(springCheckbox);

    await waitFor(() => expect(tournamentApi.setTournamentActive).toHaveBeenCalledWith('t1', false));
  });

  it('warns before activating a second tournament', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderPage();
    await screen.findByText('Fall Classic');

    const [, fallCheckbox] = screen.getAllByRole('switch');
    fireEvent.click(fallCheckbox);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Spring Cup'));
    expect(tournamentApi.setTournamentActive).not.toHaveBeenCalled();
  });

  it('proceeds with activation if confirm returns true', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    tournamentApi.setTournamentActive.mockResolvedValue({ ...mockTournaments[1], is_active: true });
    renderPage();
    await screen.findByText('Fall Classic');

    const [, fallCheckbox] = screen.getAllByRole('switch');
    fireEvent.click(fallCheckbox);

    await waitFor(() => expect(tournamentApi.setTournamentActive).toHaveBeenCalledWith('t2', true));
  });

  it('rolls back optimistic update on API error', async () => {
    tournamentApi.setTournamentActive.mockRejectedValue(new Error('Server error'));
    renderPage();
    await screen.findByText('Spring Cup');

    const [springCheckbox] = screen.getAllByRole('switch');
    fireEvent.click(springCheckbox);

    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
    expect(springCheckbox).toBeChecked();
  });

  it('shows empty state when no tournaments', async () => {
    tournamentApi.getAdminTournaments.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No tournaments yet/)).toBeInTheDocument();
  });

  it('shows load error when fetch fails', async () => {
    tournamentApi.getAdminTournaments.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });

  it('Create tournament button navigates to wizard', async () => {
    renderPage();
    await screen.findByText('Spring Cup');
    fireEvent.click(screen.getByRole('button', { name: /create tournament/i }));
    expect(await screen.findByText('Create wizard')).toBeInTheDocument();
  });
});
