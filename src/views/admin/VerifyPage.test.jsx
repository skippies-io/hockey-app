import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import VerifyPage from './VerifyPage';

// Mock useSearchParams to provide a token
const mockUseSearchParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => mockUseSearchParams(),
  };
});

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('VerifyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it('renders verifying state initially', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=test-token'), null]);
    global.fetch.mockReturnValueOnce(
      new Promise(() => {}) // Never resolves, keeps verifying state
    );

    renderWithRouter(<VerifyPage />);
    expect(screen.getByText(/verifying your login/i)).toBeInTheDocument();
    expect(screen.getByText(/please wait/i)).toBeInTheDocument();
  });

  it('shows error when no token provided', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(''), null]);

    renderWithRouter(<VerifyPage />);
    expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    expect(screen.getByText(/No token provided/)).toBeInTheDocument();
  });

  it('verifies token and stores JWT on success', async () => {
    const testToken = 'jwt-token-123';
    const testEmail = 'admin@example.com';
    
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=magic-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: testToken, email: testEmail }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
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
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=magic-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt-123', email: 'admin@example.com' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
      expect(screen.getByText(/you will be redirected/i)).toBeInTheDocument();
    });
  });

  it('shows error when token verification fails', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=invalid-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid or expired token' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid or expired token/)).toBeInTheDocument();
    });
  });

  it('shows error when response.ok is false', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=bad-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: 'Token expired' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Token expired/)).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=test-token'), null]);
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('shows helpful error message about token expiry', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=expired-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Token expired' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/15 minutes and can only be used once/)).toBeInTheDocument();
    });
  });

  it('provides button to request new link on error', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=bad-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid token' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /request a new link/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('handles missing error in response', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=test-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('handles empty search params gracefully', () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams(), null]);

    renderWithRouter(<VerifyPage />);

    expect(screen.getByText(/no token provided/i)).toBeInTheDocument();
  });

  it('decodes JWT from successful response', async () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIn0.signature';
    
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=magic-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: jwtToken, email: 'admin@example.com' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(localStorage.getItem('admin_token')).toBe(jwtToken);
    });
  });

  it('handles response without token field', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=test-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, email: 'admin@example.com' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('handles response without email field', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=test-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt-token' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(localStorage.getItem('admin_token')).toBe('jwt-token');
      // email can be null/undefined, that's ok
    });
  });

  it('re-verifies when token parameter changes', async () => {
    const { rerender } = renderWithRouter(<VerifyPage />);
    
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=token-1'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt-1', email: 'admin1@example.com' }),
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/auth/verify',
        expect.any(Object)
      );
    });

    // Change the token
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=token-2'), null]);
    global.fetch.mockClear();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt-2', email: 'admin2@example.com' }),
    });

    rerender(<VerifyPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('uses correct endpoint for verification', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=test-token'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt', email: 'admin@example.com' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/auth/verify',
        expect.any(Object)
      );
    });
  });

  it('sends token in correct format', async () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams('token=abc123'), null]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: 'jwt', email: 'admin@example.com' }),
    });

    renderWithRouter(<VerifyPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ token: 'abc123' }),
        })
      );
    });
  });
});
