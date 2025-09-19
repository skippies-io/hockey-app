import { Link, NavLink, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Standings from "./components/Standings";
import Fixtures from "./components/Fixtures";
import Team from "./views/Team";
import { getGroups } from "./lib/api";
import { FALLBACK_GROUPS } from "./config";
import "./App.css";

function Nav() {
  const linkStyle = ({ isActive }) => ({
    padding: "6px 10px",
    border: "1px solid #eee",
    borderRadius: 999,
    background: isActive ? "#eef2ff" : "#fafafa",
    textDecoration: "none",
    color: "#111",
  });
  return (
    <nav style={{ marginTop: 8, display: "flex", gap: 8 }}>
      <NavLink to="/standings" style={linkStyle}>Standings</NavLink>
      <NavLink to="/fixtures"  style={linkStyle}>Fixtures</NavLink>
    </nav>
  );
}

export default function App() {
  const [groups, setGroups] = useState(FALLBACK_GROUPS); // [{id, label}]
  const [groupId, setGroupId] = useState(FALLBACK_GROUPS[0].id);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const gs = await getGroups(); // built from Standings_All + Fixtures_All
        if (!alive || !gs.length) return;
        setGroups(gs.map(g => ({ id: g.id, label: g.label })));
        setGroupId(gs[0].id);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const group = useMemo(
    () => groups.find(g => g.id === groupId) || groups[0],
    [groups, groupId]
  );

  if (!group) {
    return (
      <div className="p-4" style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
        <h1>HJ Indoor Season 2025</h1>
        <p>No age groups found. Try refreshing.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <Link to="/standings" className="brand-link">
              {/* NOTE: assets in /public are available at the root path */}
              <img
                src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
                alt="HJ Hockey for Juniors"
                className="brand-logo"
              />
              <span className="brand-title">HJ Indoor Season 2025</span>
            </Link>
          </div>
          <div className="age-chooser">
            <label style={{ marginRight: 8 }}>Age</label>
            {loading ? (
              <span>Loading…</span>
            ) : (
              <select value={groupId} onChange={e => setGroupId(e.target.value)}>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <Nav />
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/standings" replace />} />
        <Route path="/standings" element={<Standings ageId={group.id} ageLabel={group.label} />} />
        <Route path="/fixtures"  element={<Fixtures  ageId={group.id} ageLabel={group.label} />} />
        <Route path="/team/:name" element={<Team ageId={group.id} ageLabel={group.label} />} />
        <Route path="*" element={<div className="p-4">Not found</div>} />
      </Routes>

      <footer className="footer">
        Data via Google Apps Script JSON • Route: {location.pathname}
      </footer>
    </div>
  );
}