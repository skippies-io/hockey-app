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
    expect(screen.getByText('Admin Console Loaded')).toBeTruthy();

    ['Dashboard', 'Tournaments', 'Announcements', 'Teams', 'Fixtures'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeTruthy();
    });

    expect(screen.getByText('Outlet Content')).toBeTruthy();
  });

  it('active vs inactive NavLink styling', () => {
    renderWithRoute(['/admin']);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    const tournamentsLink = screen.getByRole('link', { name: 'Tournaments' });

    const dashboardStyle = dashboardLink.getAttribute('style') || '';
    const tournamentsStyle = tournamentsLink.getAttribute('style') || '';

    expect(dashboardStyle).toContain('background-color: var(--hj-color-brand-primary)');
    expect(dashboardStyle).toContain('color: var(--hj-color-inverse-text)');

    expect(tournamentsStyle).toContain('background-color: transparent');
    expect(tournamentsStyle).toContain('color: var(--hj-color-text-secondary)');
  });
});
