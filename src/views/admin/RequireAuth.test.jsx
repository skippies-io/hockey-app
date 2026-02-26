import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  async function renderProtectedContent() {
    const { default: RequireAuth } = await import('./RequireAuth');
    return renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );
  }

  it('renders children when token is present', async () => {
    localStorage.setItem('admin_token', 'test-token-123');
    await renderProtectedContent();
    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('redirects to login when no token is present', async () => {
    localStorage.removeItem('admin_token');
    const { default: RequireAuth } = await import('./RequireAuth');
    
    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('works with JWT token format', async () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    localStorage.setItem('admin_token', jwtToken);

    const { default: RequireAuth } = await import('./RequireAuth');
    
    renderWithRouter(
      <RequireAuth>
        <div>Admin Area</div>
      </RequireAuth>
    );

    expect(screen.getByText('Admin Area')).toBeDefined();
  });

  it('treats empty string token as no token', async () => {
    localStorage.setItem('admin_token', '');
    const { default: RequireAuth } = await import('./RequireAuth');

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    // Empty string is falsy, should redirect
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('allows numeric token', async () => {
    localStorage.setItem('admin_token', '12345');
    const { default: RequireAuth } = await import('./RequireAuth');

    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected')).toBeDefined();
  });

  it('allows special characters in token', async () => {
    localStorage.setItem('admin_token', 'token-with_special.characters!@#$');
    const { default: RequireAuth } = await import('./RequireAuth');

    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected')).toBeDefined();
  });
});
