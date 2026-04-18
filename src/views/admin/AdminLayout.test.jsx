import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout.jsx';

const renderWithRoute = (initialEntries) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<div>Outlet Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('AdminLayout', () => {
  it('renders admin navigation and outlet', () => {
    renderWithRoute(['/admin']);

    expect(screen.getByRole('navigation', { name: 'Admin Navigation' })).toBeTruthy();
    expect(screen.getByText('Admin Console')).toBeTruthy();

    ['Dashboard', 'Tournaments', 'Announcements', 'Teams', 'Fixtures'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeTruthy();
    });

    expect(screen.getByText('Outlet Content')).toBeTruthy();
  });

  it('active vs inactive NavLink uses CSS classes', () => {
    renderWithRoute(['/admin']);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const tournamentsLink = screen.getByRole('link', { name: 'Tournaments' });

    expect(dashboardLink.classList.contains('admin-nav-link')).toBe(true);
    expect(dashboardLink.classList.contains('active')).toBe(true);

    expect(tournamentsLink.classList.contains('admin-nav-link')).toBe(true);
    expect(tournamentsLink.classList.contains('active')).toBe(false);
  });
});
