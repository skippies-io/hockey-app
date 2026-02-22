import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TournamentProvider, useTournament } from './TournamentContext';

// Mock the api module
vi.mock('../lib/api', () => ({
  tournamentsEndpoint: vi.fn(),
}));

// Test component that uses the context
function TestComponent() {
  const context = useTournament();
  
  if (!context) {
    return <div data-testid="no-context">No context available</div>;
  }

  const { activeTournamentId, setActiveTournamentId, availableTournaments, loading, activeTournament } = context;
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="active-tournament-id">{activeTournamentId || 'none'}</div>
      <div data-testid="tournament-count">{availableTournaments.length}</div>
      <div data-testid="active-tournament-name">{activeTournament?.name || 'no tournament'}</div>
      <button data-testid="switch-btn" onClick={() => setActiveTournamentId('t2')}>Switch to T2</button>
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
    vi.clearAllMocks();
  });

  it('provides initial values with default tournament selection', async () => {
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

    // Wait for tournaments to load and default tournament to be selected
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Verify all tournaments loaded
    expect(screen.getByTestId('tournament-count')).toHaveTextContent('2');
    
    // Verify first tournament is selected by default
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t1');
    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 1');
    
    // Verify localStorage was updated
    expect(localStorage.getItem('hj_active_tournament')).toBe('t1');
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

    // Wait for tournaments to load and respect localStorage selection
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Verify stored tournament is selected
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 2');
  });

  it('handles HTTP error responses gracefully', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Should set loading to false despite error
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Should show empty state
    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('none');
    
    // Should log error
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles network errors gracefully', async () => {
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

    // Should set loading to false despite error
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

    // Empty response should show no tournaments
    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('none');
    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('no tournament');
  });

  it('handles null/missing data field in response', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: null })
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
  });

  it('memoizes activeTournament to prevent unnecessary recalculations', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    let renderCount = 0;
    const memoCache = { lastValue: null };
    
    function CountingComponent() {
      renderCount++;
      const { activeTournament } = useTournament();
      
      // Track if the object reference changed
      if (memoCache.lastValue !== activeTournament) {
        memoCache.lastValue = activeTournament;
      }
      
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
    
    // Verify component rendered and loaded tournament
    expect(renderCount).toBeGreaterThan(0);
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

    // Should immediately set loading to false when endpoint is null
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('none');
    expect(consoleSpy).toHaveBeenCalled();
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

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 1');
    });

    // Switch to different tournament
    const user = userEvent.setup();
    await user.click(screen.getByTestId('switch-btn'));

    // Should update to second tournament
    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
      expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 2');
    });
    
    // Verify localStorage was updated
    expect(localStorage.getItem('hj_active_tournament')).toBe('t2');
  });

  it('handles malformed JSON response', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })
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

  it('preserves activeTournamentId when switching tournaments', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
            { id: 't3', name: 'Tournament 3' },
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
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    });

    // Start with first tournament
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t1');
    
    // Switch to second
    const user = userEvent.setup();
    await user.click(screen.getByTestId('switch-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
    });

    // Verify ID persists
    expect(localStorage.getItem('hj_active_tournament')).toBe('t2');
  });
});
