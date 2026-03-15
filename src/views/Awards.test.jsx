import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const apiMocks = vi.hoisted(() => ({ getAwardsRows: vi.fn() }));
const tournamentMocks = vi.hoisted(() => ({ useTournament: vi.fn() }));

vi.mock('../lib/api', () => apiMocks);
vi.mock('../context/TournamentContext', () => ({
  useTournament: () => tournamentMocks.useTournament(),
}));

import Awards from './Awards';

function renderAwards(props = {}, { route = '/U12/awards' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/:ageId/awards" element={<Awards {...props} />} />
        <Route path="*" element={<Awards {...props} />} />
      </Routes>
    </MemoryRouter>
  );
}

const SAMPLE_TOP_SCORERS = [
  { playerName: 'John Smith', teamName: 'Tigers', goals: 8, ageId: 'U12', pool: 'A' },
  { playerName: 'Jane Doe', teamName: 'Lions', goals: 6, ageId: 'U12', pool: 'A' },
  { playerName: 'Alex Brown', teamName: 'Bears', goals: 4, ageId: 'U12', pool: 'B' },
];

const SAMPLE_CLEAN_SHEETS = [
  { teamName: 'Lions', cleanSheets: 3, ageId: 'U12', pool: 'A' },
  { teamName: 'Tigers', cleanSheets: 2, ageId: 'U12', pool: 'A' },
];

describe('Awards', () => {
  beforeEach(() => {
    tournamentMocks.useTournament.mockReturnValue({ activeTournament: { id: 't1' } });
    apiMocks.getAwardsRows.mockReset();
    apiMocks.getAwardsRows.mockResolvedValue({
      topScorers: SAMPLE_TOP_SCORERS,
      cleanSheets: SAMPLE_CLEAN_SHEETS,
    });
  });

  it('shows loading state initially', () => {
    apiMocks.getAwardsRows.mockImplementation(() => new Promise(() => {}));
    renderAwards();
    expect(screen.getByText(/Loading awards/)).toBeTruthy();
  });

  it('renders Top Scorers section heading', async () => {
    renderAwards();
    await waitFor(() => screen.getByText('Top Scorers'));
    expect(screen.getByText('Top Scorers')).toBeTruthy();
  });

  it('renders Clean Sheets section heading', async () => {
    renderAwards();
    await waitFor(() => screen.getByRole('heading', { name: 'Clean Sheets' }));
    expect(screen.getByRole('heading', { name: 'Clean Sheets' })).toBeTruthy();
  });

  it('renders scorer names and goal counts', async () => {
    renderAwards();
    await waitFor(() => screen.getByText('John Smith'));
    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getAllByText('8')[0]).toBeTruthy();
    expect(screen.getAllByText('6')[0]).toBeTruthy();
  });

  it('renders scorer team names', async () => {
    renderAwards();
    await waitFor(() => screen.getByText('John Smith'));
    // team names appear in both scorers + clean sheets tables; use getAllByText
    expect(screen.getAllByText('Tigers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lions').length).toBeGreaterThan(0);
  });

  it('renders clean sheet team names and counts', async () => {
    renderAwards();
    await waitFor(() => screen.getByRole('heading', { name: 'Clean Sheets' }));
    expect(screen.getAllByText('Lions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  it('renders accessible table labels', async () => {
    renderAwards();
    await waitFor(() => screen.getByRole('table', { name: 'Top scorers' }));
    expect(screen.getByRole('table', { name: 'Top scorers' })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Clean sheets' })).toBeTruthy();
  });

  it('shows rank numbers starting from 1', async () => {
    renderAwards();
    await waitFor(() => screen.getByText('John Smith'));
    const allCells = screen.getAllByRole('cell');
    expect(allCells[0].textContent).toBe('1');
    expect(allCells[5].textContent).toBe('2'); // second scorer row first cell (rank 2, 5 cells in row)
  });

  it('shows empty state when no data returned', async () => {
    apiMocks.getAwardsRows.mockResolvedValue({ topScorers: [], cleanSheets: [] });
    renderAwards();
    await waitFor(() => screen.getByText(/No awards data yet/));
    expect(screen.getByText(/No awards data yet/)).toBeTruthy();
  });

  it('shows error state when API rejects', async () => {
    apiMocks.getAwardsRows.mockRejectedValue(new Error('Network error'));
    renderAwards();
    await waitFor(() => screen.getByText(/Network error/));
    expect(screen.getByText(/Network error/)).toBeTruthy();
  });

  it('calls getAwardsRows with tournament id and age id', async () => {
    renderAwards({}, { route: '/U12/awards' });
    await waitFor(() => screen.getByText('Top Scorers'));
    expect(apiMocks.getAwardsRows).toHaveBeenCalledWith('t1', 'U12');
  });

  it('shows empty state with no active tournament', async () => {
    tournamentMocks.useTournament.mockReturnValue({ activeTournament: null });
    renderAwards();
    await waitFor(() => screen.getByText(/No awards data yet/));
  });

  it('only shows top scorers section when no clean sheets', async () => {
    apiMocks.getAwardsRows.mockResolvedValue({ topScorers: SAMPLE_TOP_SCORERS, cleanSheets: [] });
    renderAwards();
    await waitFor(() => screen.getByText('Top Scorers'));
    expect(screen.queryByText('Clean Sheets')).toBeNull();
  });

  it('only shows clean sheets section when no scorers', async () => {
    apiMocks.getAwardsRows.mockResolvedValue({ topScorers: [], cleanSheets: SAMPLE_CLEAN_SHEETS });
    renderAwards();
    await waitFor(() => screen.getByRole('heading', { name: 'Clean Sheets' }));
    expect(screen.queryByRole('heading', { name: 'Top Scorers' })).toBeNull();
  });

  it('shows Pool column when any scorer has a pool', async () => {
    renderAwards();
    await waitFor(() => screen.getByText('Top Scorers'));
    const headers = screen.getAllByRole('columnheader');
    const labels = headers.map((h) => h.textContent);
    expect(labels).toContain('Pool');
  });

  it('shows Age column in scorers and clean sheets when ageId is all', async () => {
    renderAwards({}, { route: '/all/awards' });
    await waitFor(() => screen.getByText('Top Scorers'));
    const headers = screen.getAllByRole('columnheader');
    const labels = headers.map((h) => h.textContent);
    expect(labels.filter((l) => l === 'Age').length).toBeGreaterThanOrEqual(2);
  });

  it('shows ageId values in rows when isAllAges', async () => {
    renderAwards({}, { route: '/all/awards' });
    await waitFor(() => screen.getByText('John Smith'));
    // ageId 'U12' should appear in both scorer and clean sheet rows
    expect(screen.getAllByText('U12').length).toBeGreaterThanOrEqual(2);
  });

  it('shows pool fallback dash when a row has no pool but others do', async () => {
    apiMocks.getAwardsRows.mockResolvedValue({
      topScorers: [
        { playerName: 'Pool Player', teamName: 'Jets', goals: 5, ageId: 'U12', pool: 'A' },
        { playerName: 'No Pool Player', teamName: 'Sharks', goals: 3, ageId: 'U12', pool: null },
      ],
      cleanSheets: [
        { teamName: 'Jets', cleanSheets: 2, ageId: 'U12', pool: 'A' },
        { teamName: 'Sharks', cleanSheets: 1, ageId: 'U12', pool: null },
      ],
    });
    renderAwards();
    await waitFor(() => screen.getByText('No Pool Player'));
    // Pool column is shown (some rows have pool), null pools render as '—'
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});
