import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';

globalThis.fetch = vi.fn();

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  async function renderPage() {
    const { default: LoginPage } = await import('./LoginPage');
    return render(<LoginPage />);
  }

  it('renders login form initially', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    expect(screen.getByText('Admin Login')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('renders input field with correct placeholder', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByPlaceholderText('admin@example.com');
    expect(input).toBeDefined();
  });

  it('updates email state on input change', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('submits form with email', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/auth/request-link',
        expect.any(Object)
      );
    });
  });

  it('shows success message after successful submission', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeDefined();
      expect(screen.getByText(/test@example.com/)).toBeDefined();
    });
  });

  it('shows error when fetch fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email not found' }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'unknown@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Email not found/)).toBeDefined();
    });
  });

  it('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeDefined();
    });
  });

  it('displays helpful text in success message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'admin@test.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/will expire in 15 minutes/)).toBeDefined();
    });
  });
});
