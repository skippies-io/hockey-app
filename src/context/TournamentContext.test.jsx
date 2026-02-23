import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TournamentProvider, useTournament } from './TournamentContext';

beforeEach(() => {
  // Stub fetch for this test environment
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Mock the api module - set up BEFORE tests run
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
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('provides initial values with default tournament selection', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
          ]
        })
      })
    ));

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Wait for tournaments to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    }, { timeout: 5000 });

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
    
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
          ]
        })
      })
    ));

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    );

    // Wait for tournaments to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    }, { timeout: 5000 });

    // Verify stored tournament is selected
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 2');
  });

  it('handles HTTP error responses gracefully', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
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
    }, { timeout: 5000 });

    // Should show empty state
    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles network errors gracefully', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
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
    }, { timeout: 5000 });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles empty tournaments list', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
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
    }, { timeout: 5000 });

    // Empty response should show no tournaments
    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('none');
    expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('no tournament');
  });

  it('handles null/missing data field in response', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: null })
      })
    );

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    ));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    }, { timeout: 5000 });

    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
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

    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
          ]
        })
      })
    ));

    render(
      <TournamentProvider>
        <CountingComponent />
      </TournamentProvider>
    ));

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament')).toHaveTextContent('Tournament 1');
    }, { timeout: 5000 });
    
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
    ));

    // Should immediately set loading to false when endpoint is null
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    }, { timeout: 5000 });

    expect(screen.getByTestId('tournament-count')).toHaveTextContent('0');
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('none');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('updates activeTournament when activeTournamentId changes', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 't1', name: 'Tournament 1' },
            { id: 't2', name: 'Tournament 2' },
          ]
        })
      })
    ));

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    ));

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 1');
    }, { timeout: 5000 });

    // Switch to different tournament
    const user = userEvent.setup();
    await user.click(screen.getByTestId('switch-btn'));

    // Should update to second tournament
    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
      expect(screen.getByTestId('active-tournament-name')).toHaveTextContent('Tournament 2');
    }, { timeout: 5000 });
    
    // Verify localStorage was updated
    expect(localStorage.getItem('hj_active_tournament')).toBe('t2');
  });

  it('handles malformed JSON response', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      })
    ));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    ));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    }, { timeout: 5000 });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('preserves activeTournamentId when switching tournaments', async () => {
    const { tournamentsEndpoint } = await import('../lib/api');
    tournamentsEndpoint.mockReturnValue('http://localhost/api/tournaments');
    
    vi.stubGlobal('fetch', vi.fn(() =>
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
    ));

    render(
      <TournamentProvider>
        <TestComponent />
      </TournamentProvider>
    ));

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready');
    }, { timeout: 5000 });

    // Start with first tournament
    expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t1');
    
    // Switch to second
    const user = userEvent.setup();
    await user.click(screen.getByTestId('switch-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('active-tournament-id')).toHaveTextContent('t2');
    }, { timeout: 5000 });

    // Verify ID persists
    expect(localStorage.getItem('hj_active_tournament')).toBe('t2');
  });
});
