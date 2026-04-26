import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TournamentProvider, useTournament } from './TournamentContext';

vi.mock('../lib/api', () => ({
  tournamentsEndpoint: () => 'http://localhost:8787/api/tournaments',
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function mockOkJson(payload) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
}

// Captures context value via ref so tests can interact with it
const ContextCapture = React.forwardRef(function ContextCapture(_, ref) {
  const ctx = useTournament();
  React.useImperativeHandle(ref, () => ctx, [ctx]);
  return null;
});

describe('TournamentProvider', () => {
  let store = {};
  const mockLocalStorage = {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    clear: vi.fn(() => { store = {}; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
  };

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() => mockOkJson({ data: [] }));
  });

  it('renders children and exposes context', async () => {
    render(
      <TournamentProvider>
        <span>child</span>
      </TournamentProvider>
    );
    expect(screen.getByText('child')).toBeDefined();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  });

  it('defaults activeTournament to null when no tournaments returned', async () => {
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    expect(ref.current.activeTournament).toBeNull();
  });

  it('defaults activeTournamentId to first item when API returns tournaments', async () => {
    mockFetch.mockImplementationOnce(() =>
      mockOkJson({ data: [{ id: 't1', name: 'Cup' }, { id: 't2', name: 'League' }] })
    );
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.activeTournamentId).toBe('t1'));
  });

  it('persists activeTournamentId to localStorage on change', async () => {
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    act(() => { ref.current.setActiveTournamentId('tournament-1'); });

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hj_active_tournament',
        'tournament-1'
      );
    });
  });

  it('sanitizes activeTournamentId before writing to localStorage', async () => {
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    act(() => { ref.current.setActiveTournamentId('t1<script>alert(1)</script>'); });

    await waitFor(() => {
      const calls = mockLocalStorage.setItem.mock.calls.filter(
        ([key]) => key === 'hj_active_tournament'
      );
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[calls.length - 1][1]).toBe('t1scriptalert1script');
    });
  });

  it('skips localStorage write when id strips to empty string', async () => {
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    act(() => { ref.current.setActiveTournamentId('!!!'); });

    await new Promise((r) => setTimeout(r, 10));
    const activeTournamentCalls = mockLocalStorage.setItem.mock.calls.filter(
      ([key]) => key === 'hj_active_tournament'
    );
    expect(activeTournamentCalls).toHaveLength(0);
  });

  it('handles API fetch failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    expect(ref.current.availableTournaments).toEqual([]);
  });

  it('handles non-ok API response gracefully', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500 })
    );
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    expect(ref.current.availableTournaments).toEqual([]);
  });

  it('restores activeTournamentId from localStorage on mount', async () => {
    store['hj_active_tournament'] = 'stored-t1';
    mockFetch.mockImplementationOnce(() =>
      mockOkJson({ data: [{ id: 'stored-t1', name: 'Stored Cup' }] })
    );
    const ref = React.createRef();
    render(
      <TournamentProvider>
        <ContextCapture ref={ref} />
      </TournamentProvider>
    );
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    expect(ref.current.activeTournamentId).toBe('stored-t1');
  });
});
