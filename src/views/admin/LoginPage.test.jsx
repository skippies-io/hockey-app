import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';

globalThis.fetch = vi.fn();

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  async function renderPage() {
    const { default: LoginPage } = await import('./LoginPage');
    return render(<LoginPage />);
  }

  it('renders login form initially', async () => {
    await renderPage();
    expect(screen.getByText('Admin Login')).toBeDefined();
    // Use getByPlaceholderText instead of getByLabelText since there's no label element with that text
    expect(screen.getByPlaceholderText('admin@example.com')).toBeDefined();
  });

  it('renders input field with correct placeholder', async () => {
    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    expect(input).toBeDefined();
    expect(input.type).toBe('email');
  });

  it('updates email state on input change', async () => {
    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('submits form with email', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    const button = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/auth/request-link',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });
  });

  it('shows success message after successful submission', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    const button = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'admin@test.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeDefined();
      expect(screen.getByText(/admin@test.com/)).toBeDefined();
    });
  });

  it('shows error when fetch fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email not found' }),
    });

    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    const button = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'unknown@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/email not found/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    const button = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('displays helpful text in success message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    const button = screen.getByRole('button', { name: /send magic link/i });

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/15 minutes/)).toBeDefined();
    });
  });
});
