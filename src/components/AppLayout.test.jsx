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

const ageOptions = [{ id: 'U12', label: 'U12' }];

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

  it('renders a skip-navigation link pointing to #main-content', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AppLayout ageOptions={ageOptions} selectedAge="U12">
            <div>Content</div>
          </AppLayout>
        </BrowserRouter>
      );
    });
    const skip = screen.getByText('Skip to main content');
    expect(skip.getAttribute('href')).toBe('#main-content');
    expect(document.getElementById('main-content')).toBeTruthy();
  });

  it('marks the active nav link with aria-current="page" and leaves others unmarked', async () => {
    await act(async () => {
      render(
        <BrowserRouter>
          <AppLayout ageOptions={ageOptions} selectedAge="U12" currentTab="standings">
            <div>Content</div>
          </AppLayout>
        </BrowserRouter>
      );
    });
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    const links = nav.querySelectorAll('a');
    const active = Array.from(links).find(l => l.getAttribute('aria-current') === 'page');
    expect(active).toBeTruthy();
    expect(active.textContent).toBe('Standings');
    const inactive = Array.from(links).filter(l => l.textContent !== 'Standings');
    inactive.forEach(l => expect(l.getAttribute('aria-current')).toBeNull());
  });
});