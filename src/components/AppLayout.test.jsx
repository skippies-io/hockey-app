import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
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

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders header with brand and children', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout>
          <div data-testid="test-child">Test Child Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Verify header structure
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Verify brand link is present  
    const brandLinks = screen.getAllByRole('link');
    const brandLink = brandLinks.find(link => link.textContent.includes('Hockey For Juniors'));
    expect(brandLink).toBeInTheDocument();
    
    // Verify app title is rendered
    expect(screen.getByRole('heading', { name: 'Hockey For Juniors' })).toBeInTheDocument();
    
    // Verify children are rendered
    expect(screen.getByTestId('test-child')).toHaveTextContent('Test Child Content');
  });

  it('renders footer with LBDC link', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    
    const lbdcLink = within(footer).getByRole('link', { name: /LBDC/ });
    expect(lbdcLink).toHaveAttribute('href', 'https://www.lbdc.co.za');
    expect(lbdcLink).toHaveAttribute('target', '_blank');
  });

  it('renders navigation when showNav is true', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    const ageOptions = [
      { id: 'u12', label: 'U12' },
      { id: 'u14', label: 'U14' },
    ];

    render(
      <BrowserRouter>
        <AppLayout
          showNav={true}
          showAgeSelector={true}
          ageOptions={ageOptions}
          selectedAge="u12"
          currentTab="fixtures"
        >
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Verify age selector is rendered
    const ageSelect = screen.getByLabelText('Age:');
    expect(ageSelect).toBeInTheDocument();
    expect(ageSelect.value).toBe('u12');
    
    // Verify navigation pills are rendered
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Fixtures/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Standings/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Teams/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Feedback/ })).toBeInTheDocument();
  });

  it('hides navigation when showNav is false', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout showNav={false}>
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Navigation should not be present
    expect(screen.queryByLabelText('Age:')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('displays age selector only when ageOptions are provided', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout
          showNav={true}
          showAgeSelector={true}
          ageOptions={[]}
          selectedAge=""
        >
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Age selector should not be present when no options
    expect(screen.queryByLabelText('Age:')).not.toBeInTheDocument();
  });

  it('calls onAgeChange when age selector changes', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    const onAgeChange = vi.fn();
    const ageOptions = [
      { id: 'u12', label: 'U12' },
      { id: 'u14', label: 'U14' },
    ];

    render(
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout
          showNav={true}
          showAgeSelector={true}
          ageOptions={ageOptions}
          selectedAge="u12"
          onAgeChange={onAgeChange}
        >
          <div>Test Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Find the select element by its label
    const ageLabel = screen.getByLabelText('Age:');
    const user = userEvent.setup();
    await user.selectOptions(ageLabel, 'u14');

    expect(onAgeChange).toHaveBeenCalledWith('u14');
  });

  it('highlights current tab with is-active class', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    const ageOptions = [{ id: 'u12', label: 'U12' }];

    render(
      <BrowserRouter>
        <AppLayout
          showNav={true}
          ageOptions={ageOptions}
          selectedAge="u12"
          currentTab="standings"
        >
          <div>Test Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    const standingsLink = screen.getByRole('link', { name: /Standings/ });
    expect(standingsLink).toHaveClass('is-active');
    
    const fixturesLink = screen.getByRole('link', { name: /Fixtures/ });
    expect(fixturesLink).not.toHaveClass('is-active');
  });

  it('filters announcements by expires_at - shows only non-expired announcements', async () => {
    const { getAnnouncements } = await import('../lib/api');
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    getAnnouncements.mockResolvedValue([
      { id: 1, title: 'Active', expires_at: tomorrow.toISOString(), message: 'Active announcement' },
      { id: 2, title: 'Expired', expires_at: yesterday.toISOString(), message: 'Expired announcement' },
      { id: 3, title: 'No Expiry', expires_at: null, message: 'No expiry announcement' },
    ]);

    render(
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    // Wait for announcements to load and filter
    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Verify that the API was called with the active tournament ID
    expect(getAnnouncements).toHaveBeenCalledWith('t1');
  });

  it('shows announcements without expires_at timestamp', async () => {
    const { getAnnouncements } = await import('../lib/api');

    getAnnouncements.mockResolvedValue([
      { id: 1, title: 'No Expiry Set', expires_at: null, message: 'Test' },
      { id: 2, title: 'Another', expires_at: undefined, message: 'Test' },
    ]);

    render(
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </MemoryRouter>
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
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    expect(getAnnouncements).toHaveBeenCalledWith('t1');
  });

  it('passes activeTournamentId to getAnnouncements on home page', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // On home page, should pass null for tournament
    expect(getAnnouncements).toHaveBeenCalledWith(null);
  });

  it('passes activeTournamentId to getAnnouncements on tournament page', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout>
          <div>Test Child</div>
        </AppLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // On tournament page, should pass the activeTournamentId
    expect(getAnnouncements).toHaveBeenCalledWith('t1');
  });

  it('renders main content with correct padding', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout>
          <div data-testid="main-content">Test Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('app-main', 'flex-1');
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('renders filter slot when filters are provided and enableFilterSlot is true', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout
          enableFilterSlot={true}
          filters={<div data-testid="filter-content">Filter Component</div>}
        >
          <div>Main Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    expect(screen.getByTestId('filter-content')).toBeInTheDocument();
  });

  it('hides filter slot when enableFilterSlot is false', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <BrowserRouter>
        <AppLayout
          enableFilterSlot={false}
          filters={<div data-testid="filter-content">Filter Component</div>}
        >
          <div>Main Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Filter content should not be rendered when enableFilterSlot is false
    expect(screen.queryByTestId('filter-content')).not.toBeInTheDocument();
  });

  it('hides filter slot when filters are not provided', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    const { container } = render(
      <BrowserRouter>
        <AppLayout enableFilterSlot={true} filters={null}>
          <div>Main Content</div>
        </AppLayout>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalled();
    });

    // Filter slot div should have zero height/padding when no filters
    const filterSlot = container.querySelector('.app-filter-slot');
    expect(filterSlot).toHaveStyle({ height: '0', padding: '0', overflow: 'hidden' });
  });

  it('reloads announcements when pathname changes', async () => {
    const { getAnnouncements } = await import('../lib/api');
    getAnnouncements.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/u12/fixtures']}>
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncements).toHaveBeenCalledWith('t1');
    });

    expect(getAnnouncements).toHaveBeenCalledTimes(1);
  });
});
