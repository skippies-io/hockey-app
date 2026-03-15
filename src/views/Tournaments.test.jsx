import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Tournaments from './Tournaments';

vi.mock('../lib/api', () => ({
  getTournaments: vi.fn(),
}));

vi.mock('../context/TournamentContext', () => ({
  useTournament: vi.fn(),
}));

import { getTournaments } from '../lib/api';
import { useTournament } from '../context/TournamentContext';

const mockSetActiveTournamentId = vi.fn();

function setupTournamentContext({ activeTournamentId = null } = {}) {
  useTournament.mockReturnValue({ activeTournamentId, setActiveTournamentId: mockSetActiveTournamentId });
}

function renderTournaments() {
  return render(
    <MemoryRouter>
      <Tournaments />
    </MemoryRouter>
  );
}

describe('Tournaments view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTournamentContext();
  });

  it('shows loading state initially', () => {
    getTournaments.mockReturnValue(new Promise(() => {})); // never resolves
    renderTournaments();
    expect(screen.getByText(/loading tournaments/i)).toBeTruthy();
  });

  it('loading card has role=status', () => {
    getTournaments.mockReturnValue(new Promise(() => {}));
    const { container } = renderTournaments();
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('renders a list of tournaments after loading', async () => {
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
      { id: 't2', name: 'Spring League', season: null },
    ]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText('Winter Cup')).toBeTruthy());
    expect(screen.getByText('2025')).toBeTruthy();
    expect(screen.getByText('Spring League')).toBeTruthy();
  });

  it('shows first letter of tournament name as avatar', async () => {
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
    ]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText('W')).toBeTruthy());
  });

  it('falls back to "?" avatar when name is empty', async () => {
    getTournaments.mockResolvedValue([
      { id: 't1', name: '', season: null },
    ]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText('?')).toBeTruthy());
  });

  it('falls back to id when name is falsy', async () => {
    getTournaments.mockResolvedValue([
      { id: 'my-id', name: null, season: null },
    ]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText('my-id')).toBeTruthy());
  });

  it('renders "No tournaments found" when list is empty', async () => {
    getTournaments.mockResolvedValue([]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText(/no tournaments found/i)).toBeTruthy());
  });

  it('renders error state when API call fails', async () => {
    getTournaments.mockRejectedValue(new Error('Network error'));
    renderTournaments();
    await waitFor(() => expect(screen.getByText(/error loading tournaments/i)).toBeTruthy());
  });

  it('error card has role=alert', async () => {
    getTournaments.mockRejectedValue(new Error('Network error'));
    const { container } = renderTournaments();
    await waitFor(() => container.querySelector('[role="alert"]'));
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('renders "Tournament Directory" heading on success', async () => {
    getTournaments.mockResolvedValue([{ id: 't1', name: 'Cup', season: '2025' }]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText('Tournament Directory')).toBeTruthy());
  });

  it('shows "Active" badge for the currently active tournament', async () => {
    setupTournamentContext({ activeTournamentId: 't1' });
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
      { id: 't2', name: 'Spring League', season: null },
    ]);
    renderTournaments();
    await waitFor(() => screen.getByText('Winter Cup'));
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('does not show "Active" badge for non-active tournaments', async () => {
    setupTournamentContext({ activeTournamentId: 't1' });
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
      { id: 't2', name: 'Spring League', season: null },
    ]);
    renderTournaments();
    await waitFor(() => screen.getByText('Spring League'));
    // Only one "Active" badge should exist
    expect(screen.getAllByText('Active').length).toBe(1);
  });

  it('renders "View Tournament" button for non-active tournaments', async () => {
    setupTournamentContext({ activeTournamentId: 't1' });
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
      { id: 't2', name: 'Spring League', season: null },
    ]);
    renderTournaments();
    await waitFor(() => screen.getByText('Spring League'));
    const btn = screen.getByRole('button', { name: /view tournament/i });
    expect(btn).toBeTruthy();
  });

  it('does not render "View Tournament" button for the active tournament', async () => {
    setupTournamentContext({ activeTournamentId: 't1' });
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
    ]);
    renderTournaments();
    await waitFor(() => screen.getByText('Winter Cup'));
    expect(screen.queryByRole('button', { name: /view tournament/i })).toBeNull();
  });

  it('clicking "View Tournament" calls setActiveTournamentId with the tournament id', async () => {
    setupTournamentContext({ activeTournamentId: 't1' });
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025' },
      { id: 't2', name: 'Spring League', season: null },
    ]);
    renderTournaments();
    await waitFor(() => screen.getByText('Spring League'));
    fireEvent.click(screen.getByRole('button', { name: /view tournament/i }));
    expect(mockSetActiveTournamentId).toHaveBeenCalledWith('t2');
  });

  it('renders logo img when logo_url is present', async () => {
    getTournaments.mockResolvedValue([
      { id: 't1', name: 'Winter Cup', season: '2025', logo_url: 'https://example.com/logo.png' },
    ]);
    renderTournaments();
    await waitFor(() => screen.getByText('Winter Cup'));
    const img = screen.getByRole('img', { name: /winter cup logo/i });
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/logo.png');
  });
});
