import { describe, it, expect, vi, beforeEach } from 'vitest';
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

  it('renders when at least 1 tournament (single item case)', () => {
    useTournament.mockReturnValue({
      activeTournamentId: 't1',
      setActiveTournamentId: vi.fn(),
      availableTournaments: [{ id: 't1', name: 'One' }],
      loading: false,
    });

    render(<TournamentSwitcher />);
    expect(screen.getByText('Select Tournament:')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'One' })).toBeTruthy();
  });

  it('returns null when 0 tournaments', () => {
    useTournament.mockReturnValue({
      activeTournamentId: null,
      setActiveTournamentId: vi.fn(),
      availableTournaments: [],
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
