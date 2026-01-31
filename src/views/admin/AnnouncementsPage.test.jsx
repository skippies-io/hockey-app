import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import AnnouncementsPage from './AnnouncementsPage';

// Mock fetch
globalThis.fetch = vi.fn();

// Mock scrollTo
window.scrollTo = vi.fn();

// Mock confirm
window.confirm = vi.fn(() => true);

describe('AnnouncementsPage', () => {
  const mockAnnouncements = [
    { id: '1', title: 'Pub 1', body: 'Body 1', severity: 'info', is_published: true, created_at: new Date().toISOString() },
    { id: '2', title: 'Draft 1', body: 'Body 2', severity: 'alert', is_published: false, created_at: new Date().toISOString() }
  ];
  const mockTournaments = [
    { id: 't1', name: 'Tournament 1' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/admin/announcements')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      }
      if (typeof url === 'string' && url.includes('/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
  });

  it('renders loading state initially and then the list', async () => {
    render(<AnnouncementsPage />);
    expect(screen.getByText(/loading/i)).toBeDefined();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
    });

    expect(screen.getByText('Pub 1')).toBeDefined();
    expect(screen.getByText('Draft 1')).toBeDefined();
  });

  it('filters list by published/draft', async () => {
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByText('Pub 1'));

    const publishedTab = screen.getByRole('button', { name: /^Published$/ });
    fireEvent.click(publishedTab);
    expect(screen.getByText('Pub 1')).toBeDefined();
    expect(screen.queryByText('Draft 1')).toBeNull();

    const draftTab = screen.getByRole('button', { name: /^Draft$/ });
    fireEvent.click(draftTab);
    expect(screen.queryByText('Pub 1')).toBeNull();
    expect(screen.getByText('Draft 1')).toBeDefined();
  });

  it('updates character counters as you type', async () => {
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    const titleInput = screen.getByPlaceholderText(/headline/i);
    fireEvent.change(titleInput, { target: { value: 'New title' } });
    
    expect(screen.getByText('9/50')).toBeDefined();

    const bodyInput = screen.getByPlaceholderText(/update/i);
    fireEvent.change(bodyInput, { target: { value: 'A very short body' } });
    
    expect(screen.getByText('17/280')).toBeDefined();
  });

  it('allows creating a new announcement', async () => {
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: 'New Ann' } });
    fireEvent.change(screen.getByPlaceholderText(/update/i), { target: { value: 'New Body' } });
    
    const publishBtn = screen.getByRole('button', { name: /publish now/i });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/announcements', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"New Ann"'),
      }));
    });
  });

  it('allows editing an existing announcement', async () => {
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByText('Pub 1'));

    fireEvent.click(screen.getByText('Pub 1'));
    
    await waitFor(() => {
       expect(screen.getByDisplayValue('Pub 1')).toBeDefined();
    });
    expect(window.scrollTo).toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(/headline/i), { target: { value: 'Updated Title' } });
    fireEvent.click(screen.getByRole('button', { name: /update & publish/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/announcements/1', expect.objectContaining({
        method: 'PUT'
      }));
    });
  });

  it('allows deleting an announcement', async () => {
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByText('Pub 1'));

    const deleteBtn = screen.getAllByTitle(/delete/i)[0];
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/announcements/1', expect.objectContaining({
        method: 'DELETE'
      }));
    });
  });

  it('allows cloning an announcement', async () => {
    render(<AnnouncementsPage />);
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
      if (typeof url === 'string' && url.includes('/api/admin/announcements')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      }
      if (typeof url === 'string' && url.includes('/api/tournaments')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockTournaments }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });

    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByPlaceholderText(/headline/i));

    fireEvent.click(screen.getByRole('button', { name: /publish now/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Server exploded')).toBeDefined();
    }, { timeout: 2000 });
  });

  it('prevents saving if character limits are exceeded', async () => {
    render(<AnnouncementsPage />);
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
      if (url.includes('/api/admin/announcements')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: mockAnnouncements }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, data: [] }) });
    });
    
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByText('Pub 1'));

    const deleteBtn = screen.getAllByTitle(/delete/i)[0];
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Failed to delete.");
    });
  });

  it('allows canceling an edit', async () => {
    render(<AnnouncementsPage />);
    await waitFor(() => screen.getByText('Pub 1'));

    fireEvent.click(screen.getByText('Pub 1'));
    await waitFor(() => screen.getByText('Cancel Edit'));

    fireEvent.click(screen.getByText('Cancel Edit'));
    expect(screen.queryByText('Cancel Edit')).toBeNull();
    expect(screen.getByPlaceholderText(/headline/i).value).toBe('');
  });
});
