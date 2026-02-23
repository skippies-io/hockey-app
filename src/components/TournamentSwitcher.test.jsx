import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TournamentSwitcher from './TournamentSwitcher.jsx';

vi.mock('../context/TournamentContext', () => ({
  useTournament: vi.fn(),
}));

import { useTournament } from '../context/TournamentContext';

describe('TournamentSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unmock('../context/TournamentContext');
    localStorage.clear();
    sessionStorage.clear();
  });

  it('returns null when loading', () => {
    useTournament.mockReturnValue({
      activeTournamentId: 't1',
      setActiveTournamentId: vi.fn(),
      availableTournaments: [{ id: 't1', name: 'One' }],
      loading: true,
    });

    const { container } = render(<TournamentSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when only 1 tournament', () => {
    useTournament.mockReturnValue({
      activeTournamentId: 't1',
      setActiveTournamentId: vi.fn(),
      availableTournaments: [{ id: 't1', name: 'One' }],
      loading: false,
    });

    const { container } = render(<TournamentSwitcher />);
    expect(container.firstChild).toBeNull();
  });

  it('renders select, options, and calls setter on change with fallback labels', () => {
    const setActiveTournamentId = vi.fn();
    useTournament.mockReturnValue({
      activeTournamentId: 't1',
      setActiveTournamentId,
      availableTournaments: [
        { id: 't1', name: 'One' },
        { id: 't2', name: '' },
      ],
      loading: false,
    });

    render(<TournamentSwitcher />);

    expect(screen.getByText('Select Tournament:')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'One' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 't2' })).toBeTruthy();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 't2' } });
    expect(setActiveTournamentId).toHaveBeenCalledWith('t2');
  });
});
