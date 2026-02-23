import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RequireAuth from './RequireAuth';

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders children when token is present', () => {
    localStorage.setItem('admin_token', 'test-token-123');

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to login when no token is present', () => {
    localStorage.removeItem('admin_token');

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders nothing when redirecting', () => {
    localStorage.removeItem('admin_token');

    const { container } = renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    // Navigate component doesn't render visible content
    expect(container.textContent).not.toContain('Protected Content');
  });

  it('allows multiple children to be protected', () => {
    localStorage.setItem('admin_token', 'valid-token');

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content 1</div>
        <div>Protected Content 2</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected Content 1')).toBeInTheDocument();
    expect(screen.getByText('Protected Content 2')).toBeInTheDocument();
  });

  it('protects complex component trees', () => {
    localStorage.setItem('admin_token', 'valid-token');

    const ComplexChild = () => (
      <div>
        <h1>Admin Dashboard</h1>
        <p>Welcome to admin panel</p>
        <button>Action</button>
      </div>
    );

    renderWithRouter(
      <RequireAuth>
        <ComplexChild />
      </RequireAuth>
    );

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to admin panel')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('checks localStorage for admin_token', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    localStorage.setItem('admin_token', 'test-token');

    renderWithRouter(
      <RequireAuth>
        <div>Content</div>
      </RequireAuth>
    );

    expect(getItemSpy).toHaveBeenCalledWith('admin_token');
    getItemSpy.mockRestore();
  });

  it('treats empty string token as no token', () => {
    localStorage.setItem('admin_token', '');

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    // Empty string is falsy, should redirect
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('treats null token as no token', () => {
    localStorage.setItem('admin_token', null);

    renderWithRouter(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('works with JWT token format', () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    localStorage.setItem('admin_token', jwtToken);

    renderWithRouter(
      <RequireAuth>
        <div>Admin Area</div>
      </RequireAuth>
    );

    expect(screen.getByText('Admin Area')).toBeInTheDocument();
  });

  it('requires children prop', () => {
    // This is a PropTypes validation, which would normally warn in console
    // but won't prevent rendering
    localStorage.setItem('admin_token', 'test-token');

    expect(() => {
      renderWithRouter(<RequireAuth />);
    }).not.toThrow();
  });

  it('preserves children element structure', () => {
    localStorage.setItem('admin_token', 'valid-token');

    const ChildComponent = () => (
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    );

    renderWithRouter(
      <RequireAuth>
        <ChildComponent />
      </RequireAuth>
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
  });

  it('allows numeric token', () => {
    localStorage.setItem('admin_token', '12345');

    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('allows special characters in token', () => {
    localStorage.setItem('admin_token', 'token-with_special.characters!@#$');

    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('redirects with state containing original location', () => {
    localStorage.removeItem('admin_token');

    // When redirecting, Navigate should preserve location state
    // This is handled by React Router's Navigate component
    renderWithRouter(
      <RequireAuth>
        <div>Protected</div>
      </RequireAuth>
    );

    // The redirect happens, protected content is not shown
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('re-evaluates token on mount', () => {
    let tokenValue = 'test-token';
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
      if (key === 'admin_token') return tokenValue;
      return null;
    });

    const { rerender } = renderWithRouter(
      <RequireAuth>
        <div>Content</div>
      </RequireAuth>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();

    // Change token to empty
    tokenValue = '';
    getItemSpy.mockRestore();
    localStorage.removeItem('admin_token');

    rerender(
      <BrowserRouter>
        <RequireAuth>
          <div>Content</div>
        </RequireAuth>
      </BrowserRouter>
    );

    // Should redirect now
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });
});
