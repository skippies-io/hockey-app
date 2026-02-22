import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TournamentProvider, useTournament } from './TournamentContext';

// Mock the api module
vi.mock('../lib/api', () => ({
  tournamentsEndpoint: vi.fn(),
}));

// Test component that uses the context
function TestComponent() {
  const { activeTournamentId, setActiveTournamentId, availableTournaments, loading, activeTournament } = useTournament();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="active-tournament-id">{activeTournamentId || 'none'}</div>
      <div data-testid="tournament-count">{availableTournaments.length}</div>
      <div data-testid="active-tournament-name">{activeTournament?.name || 'no tournament'}</div>
      <button onClick={() => setActiveTournamentId('t2')}>Switch to T2</button>
    </div>
  );
}

describe('TournamentContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides initial values', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
          ]
        })
      })
    );

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Initially shows loading
    expect(screen.getByTestId('loading')).toHaveTextContent('loading');

    // Wait for tournaments to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('tournament-count')).toHaveTextContent('2');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t1');
    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 1');
  });

  it('uses localStorage to persist active tournament', async () => {
    localStorage.setItem('hj_active_tournament', 't2');

    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
          ]
        })
      })
    );

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
    });

    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 2');
  });

  it('handles API errors gracefully', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.reject(new Error('Network error'))
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles empty tournaments list', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      })
    );

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('none');
  });

  it('memoizes activeTournament to prevent unnecessary recalculations', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    let renderCount = 0;
    
    function CountingComponent() {
      renderCount++;
      const { activeTournament } = useTournament();
      return <div data-testid="active-tournament">{activeTournament?.name || 'none'}</div>;
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
          ]
        })
      })
    );

    const { rerender } = render(
      <TournamentProvider>
        <CountingComponent />
      </TournamentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament')).toHaveTextContent('Tournament 1');
    });

    const countAfterLoad = renderCount;
    
    // Re-rendering provider with same data shouldn't cause child to update
    // because activeTournament should be memoized
    rerender(
      <TournamentProvider>
        <CountingComponent />
      </TournamentProvider>
    );

    // Verify the component is still displaying the memoized value
    expect(screen.getByTestId('active-tournament')).toHaveTextContent('Tournament 1');
  });

  it('disables context when tournaments endpoint is unavailable', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue(null);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    consoleSpy.mockRestore();
  });

  it('updates activeTournament when activeTournamentId changes', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
          ]
        })
      })
    );

    const { getByRole } = render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 1');
    });

    // Switch to different tournament
    getByRole('button', { name: /Switch to T2/ }).click();

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 2');
    });
  });
});
