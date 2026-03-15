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
  const sidebarStyle = {
    width: '250px',
    backgroundColor: 'var(--hj-color-surface-2)',
    borderRight: '1px solid var(--hj-color-border-subtle)',
    padding: 'var(--hj-space-4)',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 100,
  };

  const contentStyle = {
    marginLeft: '250px',
    padding: 'var(--hj-space-6)',
    backgroundColor: 'var(--hj-color-surface-1)',
    minHeight: '100vh',
    color: 'var(--hj-color-text-primary)'
  };

  const linkStyle = ({ isActive }) => ({
    display: 'block',
    padding: 'var(--hj-space-2) var(--hj-space-3)',
    marginBottom: 'var(--hj-space-2)',
    borderRadius: 'var(--hj-radius-md)',
    textDecoration: 'none',
    color: isActive ? 'var(--hj-color-inverse-text)' : 'var(--hj-color-text-secondary)',
    backgroundColor: isActive ? 'var(--hj-color-brand-primary)' : 'transparent',
    fontWeight: isActive ? 'var(--hj-font-weight-bold)' : 'var(--hj-font-weight-regular)',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{ display: 'flex' }}>
      <nav style={sidebarStyle} aria-label="Admin Navigation">
        <h2 style={{ 
          marginBottom: 'var(--hj-space-3)', 
          color: 'var(--hj-color-text-primary)',
          fontSize: 'var(--hj-font-size-lg)',
          fontWeight: 'var(--hj-font-weight-bold)'
        }}>
          Admin Console
        </h2>

        {email && (
          <div style={{
            marginBottom: 'var(--hj-space-4)',
            color: 'var(--hj-color-text-secondary)',
            fontSize: 'var(--hj-font-size-sm)',
            wordBreak: 'break-word',
          }}>
            Signed in as<br />{email}
          </div>
        )}
        
        <NavLink to="/admin" end style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/admin/tournaments" style={linkStyle}>Tournaments</NavLink>
        <NavLink to="/admin/announcements" style={linkStyle}>Announcements</NavLink>
        <NavLink to="/admin/teams" style={linkStyle}>Teams</NavLink>
        <NavLink to="/admin/fixtures" style={linkStyle}>Fixtures</NavLink>
        <NavLink to="/admin/digests" style={linkStyle}>Share Digests</NavLink>

        <div style={{ marginTop: 'auto' }}>
          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2) var(--hj-space-3)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border-subtle)',
              background: 'transparent',
              color: 'var(--hj-color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
}
