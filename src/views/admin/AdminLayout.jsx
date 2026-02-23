import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();
  const email = localStorage.getItem('admin_email') || '';
  
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
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
          marginBottom: 'var(--hj-space-6)', 
          color: 'var(--hj-color-text-primary)',
          fontSize: 'var(--hj-font-size-lg)',
          fontWeight: 'var(--hj-font-weight-bold)'
        }}>
          Admin Console Loaded
        </h2>
        
        <NavLink to="/admin" end style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/admin/tournaments" style={linkStyle}>Tournaments</NavLink>
        <NavLink to="/admin/announcements" style={linkStyle}>Announcements</NavLink>
        <NavLink to="/admin/teams" style={linkStyle}>Teams</NavLink>
        <NavLink to="/admin/fixtures" style={linkStyle}>Fixtures</NavLink>
        
        <div style={{ marginTop: 'auto', paddingTop: 'var(--hj-space-4)', borderTop: '1px solid var(--hj-color-border-subtle)' }}>
          <div style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-tertiary)', marginBottom: 'var(--hj-space-2)' }}>
            Logged in as:
          </div>
          <div style={{ fontSize: 'var(--hj-font-size-sm)', color: 'var(--hj-color-text-secondary)', marginBottom: 'var(--hj-space-3)', wordBreak: 'break-word' }}>
            {email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: 'var(--hj-space-2)',
              borderRadius: 'var(--hj-radius-md)',
              border: '1px solid var(--hj-color-border)',
              background: 'transparent',
              color: 'var(--hj-color-text-secondary)',
              cursor: 'pointer',
              fontSize: 'var(--hj-font-size-sm)',
              fontWeight: 'var(--hj-font-weight-medium)'
            }}
          >
            Log out
          </button>
        </div>
      </nav>

      <main style={contentStyle}>
        <Outlet />
      </main>
    </div>
  );
}
