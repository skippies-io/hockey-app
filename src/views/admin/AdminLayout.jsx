import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAdminSession, getAdminEmail } from '../../lib/adminAuth';

export default function AdminLayout() {
  const navigate = useNavigate();
  const email = getAdminEmail();

  const logout = () => {
    clearAdminSession();
    navigate('/admin/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `admin-nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="admin-layout">
      <nav className="admin-sidebar" aria-label="Admin Navigation">
        <h2 className="admin-sidebar-title">Admin Console</h2>

        {email && (
          <div className="admin-sidebar-email">
            Signed in as<br />{email}
          </div>
        )}

        <NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink>
        <NavLink to="/admin/tournaments" className={navLinkClass}>Tournaments</NavLink>
        <NavLink to="/admin/announcements" className={navLinkClass}>Announcements</NavLink>
        <NavLink to="/admin/venues" className={navLinkClass}>Venues</NavLink>
        <NavLink to="/admin/franchises" className={navLinkClass}>Franchises</NavLink>
        <NavLink to="/admin/teams" className={navLinkClass}>Teams</NavLink>
        <NavLink to="/admin/fixtures" className={navLinkClass}>Fixtures</NavLink>
        <div className="admin-sidebar-footer">
          <button
            type="button"
            onClick={logout}
            className="admin-logout-btn"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
