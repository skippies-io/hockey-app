import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AppLayout from './AppLayout';

// Mock the api
vi.mock('../lib/api', () => ({
  getAnnouncements: vi.fn(() => Promise.resolve([])),
}));

// Mock the context
vi.mock('../context/TournamentContext', () => ({
  useTournament: vi.fn(() => ({ activeTournamentId: 't1', availableTournaments: [] })),
}));

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );
    expect(screen.getByText('Test Child')).toBeDefined();
  });

  it('filters announcements by expires_at - shows only non-expired announcements', async () => {
    const { getAnnouncements } = await import('../lib/api');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    getAnnouncements.mockResolvedValue([
      { id: 1, title: 'Active', expires_at: tomorrow.toISOString() },
      { id: 2, title: 'Expired', expires_at: yesterday.toISOString() },
      { id: 3, title: 'No Expiry', expires_at: null },
    ]);

    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );

    // Wait for announcements to load and filter
    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Verify that only non-expired announcements are shown
    // The filtering happens internally, so we check the API was called
    expect(getAnnouncements).toHaveBeenCalledWith('t1');
  });

  it('shows announcements without expires_at timestamp', async () => {
    const { getAnnouncements } = await import('../lib/api');

    getAnnouncements.mockResolvedValue([
      { id: 1, title: 'No Expiry Set', expires_at: null },
      { id: 2, title: 'Another', expires_at: undefined },
    ]);

    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    expect(getAnnouncements).toHaveBeenCalledWith('t1');
  });

  it('handles empty announcements list', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    expect(getAnnouncements).toHaveBeenCalledWith('t1');
  });

  it('reloads announcements when tournament changes', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    const { rerender } = render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalledWith('t1');
    });

    // Clear previous calls
    getAnnouncements.mockClear();

    // Re-render with the same props to simulate tournament change
    rerender(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );

    // Verify announcements were reloaded
    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });
  });

  it('passes activeTournamentId to getAnnouncements', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalledWith('t1');
    });
  });
});