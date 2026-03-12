import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from './AppLayout';

// Mock the api
vi.mock('../lib/api', () => ({
  getAnnouncements: vi.fn(() => Promise.resolve([])),
  getMeta: vi.fn(() => Promise.resolve({ ok: true, last_sync_at: new Date().toISOString() })),
  getCachedLastSyncAt: vi.fn(() => ''),
}));

// Mock the context
vi.mock('../context/TournamentContext', () => ({
  useTournament: vi.fn(() => ({ activeTournamentId: 't1', availableTournaments: [] })),
}));

describe('AppLayout', () => {
  it('renders children', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AppLayout>
            <div>Test Child</div>
          </AppLayout>
        </BrowserRouter>
      );
    });
    expect(screen.getByText('Test Child')).toBeDefined();
  });
});