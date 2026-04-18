import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import FranchiseDetailPage from './FranchiseDetailPage';
import * as franchiseApi from '../../lib/franchiseApi';
import * as venueApi from '../../lib/venueApi';

vi.mock('../../lib/franchiseApi');
vi.mock('../../lib/venueApi');

const mockFranchise = {
  id: 'f1',
  name: 'Alpha FC',
  logo_url: '',
  manager_name: 'Coach A',
  manager_photo_url: '',
  manager_bio: 'Great coach',
  contact_phone: '555-1234',
  contact_email: 'alpha@example.com',
  home_venue_id: 'v1',
};

const mockVenues = [
  { id: 'v1', name: 'Main Rink' },
  { id: 'v2', name: 'North Rink' },
];

const mockTeams = [
  { team_id: 't1', team_name: 'Alpha U9', group_id: 'U9', tournament_id: 'tr1', tournament_name: 'Spring Cup', season: '2024-25' },
  { team_id: 't2', team_name: 'Alpha U12', group_id: 'U12', tournament_id: 'tr1', tournament_name: 'Spring Cup', season: '2024-25' },
  { team_id: 't3', team_name: 'Alpha U9', group_id: 'U9', tournament_id: 'tr2', tournament_name: 'Fall Classic', season: '2023-24' },
];

function renderDetail(id = 'f1') {
  return render(
    <MemoryRouter initialEntries={[`/admin/franchises/${id}`]}>
      <Routes>
        <Route path="/admin/franchises/:franchiseId" element={<FranchiseDetailPage />} />
        <Route path="/admin/franchises" element={<div>Franchises list</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('FranchiseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    franchiseApi.getFranchise.mockResolvedValue(mockFranchise);
    franchiseApi.getFranchiseTeams.mockResolvedValue(mockTeams);
    venueApi.getVenues.mockResolvedValue(mockVenues);
  });

  it('renders franchise name as heading', async () => {
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Alpha FC' })).toBeInTheDocument();
  });

  it('pre-fills form fields from franchise data', async () => {
    renderDetail();
    expect(await screen.findByDisplayValue('Coach A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alpha@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Great coach')).toBeInTheDocument();
  });

  it('populates home venue dropdown', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });
    const select = screen.getByLabelText('Home venue');
    expect(select).toHaveValue('v1');
    expect(screen.getByRole('option', { name: 'Main Rink' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'North Rink' })).toBeInTheDocument();
  });

  it('sends null for empty optional fields on save', async () => {
    franchiseApi.getFranchise.mockResolvedValue({
      ...mockFranchise,
      manager_name: '',
      manager_bio: '',
      contact_phone: '',
      contact_email: '',
      home_venue_id: '',
    });
    franchiseApi.updateFranchise.mockResolvedValue({ ...mockFranchise });
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(franchiseApi.updateFranchise).toHaveBeenCalledWith('f1', expect.objectContaining({
        manager_name: null,
        manager_bio: null,
        contact_phone: null,
        contact_email: null,
        home_venue_id: null,
      }));
    });
  });

  it('saves changes and shows saved confirmation', async () => {
    franchiseApi.updateFranchise.mockResolvedValue({ ...mockFranchise, manager_name: 'New Coach' });
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(franchiseApi.updateFranchise).toHaveBeenCalledWith('f1', expect.objectContaining({
        name: 'Alpha FC',
        manager_name: 'Coach A',
      }));
    });
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows error when save fails', async () => {
    franchiseApi.updateFranchise.mockRejectedValue(new Error('Save failed'));
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Save failed')).toBeInTheDocument();
  });

  it('shows teams grouped by season as collapsed accordions', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });
    await screen.findByText('2024-25');

    expect(screen.getByText('2024-25')).toBeInTheDocument();
    expect(screen.getByText('2023-24')).toBeInTheDocument();
    // Rows are collapsed — team names not visible yet
    expect(screen.queryByText('Alpha U9')).not.toBeInTheDocument();
  });

  it('expands a season row on click to show teams', async () => {
    renderDetail();
    await screen.findByText('2024-25');

    fireEvent.click(screen.getByText('2024-25'));

    expect(await screen.findByText('Alpha U9')).toBeInTheDocument();
    expect(screen.getByText('Alpha U12')).toBeInTheDocument();
    expect(screen.getAllByText('Spring Cup').length).toBeGreaterThan(0);
  });

  it('shows loading state while teams are fetching', async () => {
    franchiseApi.getFranchiseTeams.mockReturnValue(new Promise(() => {}));
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });
    expect(screen.getByText('Loading teams…')).toBeInTheDocument();
  });

  it('groups teams with no season under "No season"', async () => {
    franchiseApi.getFranchiseTeams.mockResolvedValue([
      { team_id: 't1', team_name: 'Alpha U9', group_id: 'U9', tournament_id: 'tr1', tournament_name: 'Spring Cup', season: null },
    ]);
    renderDetail();
    await screen.findByText('No season');
  });

  it('shows empty teams message when no teams', async () => {
    franchiseApi.getFranchiseTeams.mockResolvedValue([]);
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });
    expect(await screen.findByText(/No teams linked/)).toBeInTheDocument();
  });

  it('shows load error when franchise fetch fails', async () => {
    franchiseApi.getFranchise.mockRejectedValue(new Error('Not found'));
    renderDetail();
    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  it('editing a field clears saved state', async () => {
    franchiseApi.updateFranchise.mockResolvedValue({ ...mockFranchise });
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Saved.');

    fireEvent.change(screen.getByDisplayValue('Coach A'), { target: { value: 'New Coach' } });
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument();
  });

  it('still renders when teams fetch fails', async () => {
    franchiseApi.getFranchiseTeams.mockRejectedValue(new Error('Teams unavailable'));
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'Alpha FC' })).toBeInTheDocument();
    expect(await screen.findByText(/No teams linked/)).toBeInTheDocument();
  });

  it('shows logo preview when logo_url is set', async () => {
    franchiseApi.getFranchise.mockResolvedValue({ ...mockFranchise, logo_url: 'https://example.com/logo.png' });
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });
    expect(screen.getByAltText('Logo preview')).toBeInTheDocument();
  });

  it('shows manager photo preview when manager_photo_url is set', async () => {
    franchiseApi.getFranchise.mockResolvedValue({ ...mockFranchise, manager_photo_url: 'https://example.com/photo.png' });
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });
    expect(screen.getByAltText('Manager photo preview')).toBeInTheDocument();
  });

  it('collapses expanded season accordion on second click', async () => {
    renderDetail();
    await screen.findByText('2024-25');

    fireEvent.click(screen.getByText('2024-25'));
    expect(await screen.findByText('Alpha U9')).toBeInTheDocument();

    fireEvent.click(screen.getByText('2024-25'));
    expect(screen.queryByText('Alpha U9')).not.toBeInTheDocument();
  });

  it('back button navigates to franchise list', async () => {
    renderDetail();
    await screen.findByRole('heading', { name: 'Alpha FC' });

    fireEvent.click(screen.getByRole('button', { name: /back to franchises/i }));

    expect(await screen.findByText('Franchises list')).toBeInTheDocument();
  });
});
