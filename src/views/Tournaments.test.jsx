import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Tournaments from './Tournaments';

vi.mock('../lib/api', () => ({
  getTournaments: vi.fn(),
}));

import { getTournaments } from '../lib/api';

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
  });

  it('shows loading state initially', () => {
    getTournaments.mockReturnValue(new Promise(() => {})); // never resolves
    renderTournaments();
    expect(screen.getByText(/loading tournaments/i)).toBeTruthy();
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

  it('renders "Tournament Directory" heading on success', async () => {
    getTournaments.mockResolvedValue([{ id: 't1', name: 'Cup', season: '2025' }]);
    renderTournaments();
    await waitFor(() => expect(screen.getByText('Tournament Directory')).toBeTruthy());
  });
});
