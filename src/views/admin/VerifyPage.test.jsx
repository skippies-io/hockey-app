import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

globalThis.fetch = vi.fn();

const renderWithRouter = (component, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {component}
    </MemoryRouter>
  );
};

describe('VerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
    localStorage.clear();
  });

  async function renderPage(token) {
    const { default: VerifyPage } = await import('./VerifyPage');
    return renderWithRouter(<VerifyPage />, [`/admin/verify?token=${token || 'test-token'}`]);
  }

  it('renders verifying state initially', async () => {
    fetch.mockReturnValueOnce(
      new Promise(() => {}) // Never resolves, keeps verifying state
    );

    await renderPage('test-token');
    
    expect(screen.getByText(/verifying your login/i)).toBeDefined();
    expect(screen.getByText(/please wait/i)).toBeDefined();
  });

  it('shows error when no token provided', async () => {
    const { default: VerifyPage } = await import('./VerifyPage');
    renderWithRouter(<VerifyPage />, ['/admin/verify']);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeDefined();
      expect(screen.getByText(/no token provided/i)).toBeDefined();
    });
  });

  it('verifies token and stores JWT on success', async () => {
    const testToken = 'jwt-token-123';
    const testEmail = 'admin@example.com';
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: testToken, email: testEmail }),
    });

    await renderPage('magic-token');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/auth/verify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'magic-token' }),
        })
      );
    });

    await waitFor(() => {
      expect(localStorage.getItem('admin_token')).toBe(testToken);
      expect(localStorage.getItem('admin_email')).toBe(testEmail);
    });
  });

  it('shows success message after successful verification', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt-123', email: 'admin@example.com' }),
    });

    await renderPage('magic-token');

    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeDefined();
      expect(screen.getByText(/you will be redirected/i)).toBeDefined();
    });
  });

  it('shows error when token verification fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid or expired token' }),
    });

    await renderPage('invalid-token');

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeDefined();
      expect(screen.getByText(/invalid or expired token/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('shows error when response.ok is false', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: 'Token expired' }),
    });

    await renderPage('bad-token');

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeDefined();
      expect(screen.getByText(/token expired/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('handles network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await renderPage('test-token');

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeDefined();
      expect(screen.getByText(/network error/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('shows helpful error message about token expiry', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Token expired' }),
    });

    await renderPage('expired-token');

    await waitFor(() => {
      expect(screen.getByText(/15 minutes and can only be used once/)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('provides button to request new link on error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid token' }),
    });

    await renderPage('bad-token');

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /request a new link/i });
      expect(button).toBeDefined();
    }, { timeout: 2000 });
  });

  it('stores JWT token from successful response', async () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.signature';
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: jwtToken, email: 'admin@example.com' }),
    });

    await renderPage('magic-token');

    await waitFor(() => {
      expect(localStorage.getItem('admin_token')).toBe(jwtToken);
    });
  });

  it('uses correct endpoint for verification', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt', email: 'admin@example.com' }),
    });

    await renderPage('test-token');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/auth/verify',
        expect.any(Object)
      );
    });
  });

  it('sends token in correct format', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt', email: 'admin@example.com' }),
    });

    await renderPage('abc123');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ token: 'abc123' }),
        })
      );
    });
  });
});
