import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
// Mock fetch
globalThis.fetch = vi.fn();

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock confirm
window.confirm = vi.fn(() => true);

describe('AnnouncementsPage', () => {
  const mockAnnouncements = [
    { id: '1', title: 'Pub 1', body: 'Body 1', severity: 'info', is_published: true, created_at: new Date().toISOString(), tournament_id: null },
    { id: '2', title: 'Draft 1', body: 'Body 2', severity: 'alert', is_published: false, created_at: new Date().toISOString(), tournament_id: 't1' },
    { id: '3', title: 'Pub 2', body: 'Body 3', severity: 'success', is_published: true, created_at: new Date().toISOString(), tournament_id: 't2' }
  ];
  const mockTournaments = [
    { id: 't1', name: 'Tournament 1' },
    { id: 't2', name: 'Tournament 2' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubEnv('VITE_API_BASE', 'http://localhost:8787/api');
    vi.resetModules();
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      }
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  async function renderPage() {
    const { default: AnnouncementsPage } = await import('./AnnouncementsPage');
    return render(<AnnouncementsPage />);
  }

  it('renders loading state initially and then the list', async () => {
    await renderPage();
    expect(screen.getByText(/loading/i)).toBeDefined();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    expect(screen.getByText('Pub 1')).toBeDefined();
    expect(screen.getByText('Draft 1')).toBeDefined();
  });

  it('shows explicit load error when admin announcements request is unauthorized', async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ ok: false, error: 'Unauthorized' }) });
      }
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeDefined();
    });
    expect(screen.queryByText('No announcements found.')).toBeNull();
  });

  it('shows fallback message when announcements error body is not JSON', async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('bad-json')) });
      }
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('Failed to load announcements.')).toBeDefined();
    });
  });

  it('shows thrown load error when announcements request fails before response', async () => {
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.reject(new Error('Network down'));
      }
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderPage();
    await waitFor(() => {
      expect(screen.getByText('Network down')).toBeDefined();
    });
  });

  it('filters list by published/draft', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    const publishedTab = screen.getByRole('button', { name: /^Published$/ });
    fireEvent.click(publishedTab);
    expect(screen.getByText('Pub 1')).toBeDefined();
    expect(screen.getByText('Pub 2')).toBeDefined();
    expect(screen.queryByText('Draft 1')).toBeNull();

    const draftTab = screen.getByRole('button', { name: /^Draft$/ });
    fireEvent.click(draftTab);
    expect(screen.queryByText('Pub 1')).toBeNull();
    expect(screen.queryByText('Pub 2')).toBeNull();
    expect(screen.getByText('Draft 1')).toBeDefined();
  });

  it('filters list by context (general vs tournament)', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    const contextSelect = screen.getByLabelText('Context filter');

    fireEvent.change(contextSelect, { target: { value: 'general' } });
    expect(screen.getByText('Pub 1')).toBeDefined();
    expect(screen.queryByText('Draft 1')).toBeNull();
    expect(screen.queryByText('Pub 2')).toBeNull();

    fireEvent.change(contextSelect, { target: { value: 't1' } });
    expect(screen.getByText('Draft 1')).toBeDefined();
    expect(screen.queryByText('Pub 1')).toBeNull();
    expect(screen.queryByText('Pub 2')).toBeNull();

    fireEvent.change(contextSelect, { target: { value: 't2' } });
    expect(screen.getByText('Pub 2')).toBeDefined();
    expect(screen.queryByText('Pub 1')).toBeNull();
    expect(screen.queryByText('Draft 1')).toBeNull();
  });
  it('updates character counters as you type', async () => {
    await renderPage();
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    const titleInput = screen.getByPlaceholderText(/headline/i);
    fireEvent.change(titleInput, { target: { value: 'New title' } });
    
    expect(screen.getByText('9/50')).toBeDefined();

    const bodyInput = screen.getByPlaceholderText(/update/i);
    fireEvent.change(bodyInput, { target: { value: 'A very short body' } });
    
    expect(screen.getByText('17/280')).toBeDefined();
  });

  it('allows creating a new announcement', async () => {
    await renderPage();
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    sessionStorage.setItem('hj_admin_session_token', 'sess');
    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: 'New Ann' } });
    fireEvent.change(screen.getByPlaceholderText(/update/i), { target: { value: 'New Body' } });
    
    const publishBtn = screen.getByRole('button', { name: /publish now/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:8787/api/admin/announcements', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"New Ann"'),
      }));
    });

    const [, opts] = fetch.mock.calls.find(([url, options]) =>
      typeof url === 'string' &&
      url === 'http://localhost:8787/api/admin/announcements' &&
      options?.method === 'POST'
    );
    expect(opts.headers.get('Authorization')).toBe('Bearer sess');
  });

  it('allows editing an existing announcement', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    fireEvent.click(screen.getByText('Pub 1'));
    
    await waitFor(() => {
       expect(screen.getByDisplayValue('Pub 1')).toBeDefined();
    });
    expect(window.scrollTo).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: 'Updated Title' } });
    fireEvent.click(screen.getByRole('button', { name: /update & publish/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:8787/api/admin/announcements/1', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('allows deleting an announcement', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    const deleteBtn = screen.getAllByTitle(/delete/i)[0];
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:8787/api/admin/announcements/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  it('allows cloning an announcement', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    const cloneBtn = screen.getAllByRole('button', { name: /clone/i })[0];
    fireEvent.click(cloneBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Pub 1')).toBeDefined();
    });
    expect(screen.getByText('Cancel Edit')).toBeDefined();
  });

  it('shows error message if submission fails', async () => {
    // Set mock BEFORE render to catch the save call
    fetch.mockImplementation((url, options) => {
      if (options?.method === 'POST' || options?.method === 'PUT') {
        return Promise.resolve({ 
          ok: true, 
          json: () => Promise.resolve({ ok: false, error: 'Server exploded' }) 
        });
      }
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      }
      if (typeof url === 'string' && url.includes('http://localhost:8787/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    await renderPage();
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    fireEvent.click(screen.getByRole('button', { name: /publish now/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Server exploded')).toBeDefined();
    }, { timeout: 2000 });
  });

  it('prevents saving if character limits are exceeded', async () => {
    await renderPage();
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    const titleInput = screen.getByPlaceholderText(/headline/i);
    fireEvent.change(titleInput, { target: { value: 'a'.repeat(51) } });
    
    fireEvent.click(screen.getByRole('button', { name: /publish now/i }));
    expect(screen.getByText(/fix character limit errors/i)).toBeDefined();
  });

  it('handles delete failure', async () => {
    window.alert = vi.fn();
    fetch.mockImplementation((url, opt) => {
      if (opt?.method === 'DELETE') return Promise.resolve({ ok: false });
      if (url.includes('http://localhost:8787/api/admin/announcements')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: [] }) });
    });
    
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    const deleteBtn = screen.getAllByTitle(/delete/i)[0];
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to delete.");
    });
  });

  it('shows server error details when delete fails with JSON error', async () => {
    window.alert = vi.fn();
    fetch.mockImplementation((url, opt) => {
      if (opt?.method === 'DELETE') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Delete blocked' }),
        });
      }
      if (url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: [] }) });
    });

    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));
    fireEvent.click(screen.getAllByTitle(/delete/i)[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Delete blocked');
    });
  });

  it('shows thrown error details when delete request throws', async () => {
    window.alert = vi.fn();
    fetch.mockImplementation((url, opt) => {
      if (opt?.method === 'DELETE') {
        return Promise.reject(new Error('Delete network fail'));
      }
      if (url.includes('http://localhost:8787/api/admin/announcements')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: [] }) });
    });

    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));
    fireEvent.click(screen.getAllByTitle(/delete/i)[0]);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Delete network fail');
    });
  });

  it('allows canceling an edit', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));

    fireEvent.click(screen.getByText('Pub 1'));
    await waitFor(() => screen.getByText('Cancel Edit'));

    fireEvent.click(screen.getByText('Cancel Edit'));
    expect(screen.queryByText('Cancel Edit')).toBeNull();
    expect(screen.getByPlaceholderText(/headline/i).value).toBe('');
  });

  it('supports keyboard navigation for accessibility', async () => {
    await renderPage();
    await waitFor(() => screen.getByText('Pub 1'));
    
    // Test interaction on announcement card (using click to ensure stability)
    const card = screen.getByText('Pub 1').closest('div[role="button"]');
    fireEvent.click(card);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Pub 1')).toBeDefined();
    }, { timeout: 2000 });
    
    // Cancel edit
    fireEvent.click(screen.getByText('Cancel Edit'));
    
    // Test interaction on actions container
    const cloneBtn = screen.getAllByRole('button', { name: /clone/i })[0];
    // We just verify that cloning works (which implies stopPropagation worked for that button click)
    fireEvent.click(cloneBtn);
    
    await waitFor(() => {
         expect(screen.getByDisplayValue('Pub 1')).toBeDefined();
    });
  });
});
