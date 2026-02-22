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
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('accepts email input', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect(input.value).toBe('test@example.com');
  });

  it('submits form and sends email', async () => {
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

  it('shows success message after submission', async () => {
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
      expect(screen.getByText(/check your email/i)).toBeDefined();
    });
  });

  it('displays email in success message', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'myemail@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/myemail@example.com/)).toBeDefined();
    });
  });

  it('shows error on failed response', async () => {
    let resolveResponse;
    const responsePromise = new Promise(resolve => {
      resolveResponse = resolve;
    });

    fetch.mockReturnValueOnce({
      ok: false,
      json: async () => {
        await responsePromise;
        return { error: 'Email not found' };
      },
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'unknown@example.com' } });
    fireEvent.click(button);

    resolveResponse();

    await waitFor(() => {
      expect(screen.getByText(/Email not found/)).toBeDefined();
    });
  });

  it('handles response with data.ok false', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: 'Server error' }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeDefined();
    });
  });

  it('handles network rejection', async () => {
    let rejectRequest;
    const requestPromise = new Promise((_, reject) => {
      rejectRequest = reject;
    });

    fetch.mockReturnValueOnce(requestPromise);

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(button);

    rejectRequest(new Error('Network timeout'));

    await waitFor(() => {
      expect(screen.getByText(/Network timeout/)).toBeDefined();
    });
  });

  it('sends correct POST body', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'admin@hockey.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      const callArg = fetch.mock.calls[0][1];
      const body = JSON.parse(callArg.body);
      expect(body.email).toBe('admin@hockey.com');
    });
  });

  it('sets correct Content-Type header', async () => {
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
      const callArg = fetch.mock.calls[0][1];
      expect(callArg.headers['Content-Type']).toBe('application/json');
    });
  });

  it('displays 15 minute expiry notice', async () => {
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
      expect(screen.getByText(/15 minutes/)).toBeDefined();
    });
  });

  it('allows sending another link', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await renderPage();
    const input = screen.getByLabelText('Email');
    const button = screen.getByRole('button');

    fireEvent.change(input, { target: { value: 'test1@example.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeDefined();
    });

    const newLinkButton = screen.getByRole('button', { name: /send another/i });
    fireEvent.click(newLinkButton);

    expect(screen.getByLabelText('Email')).toBeDefined();
  });
});
