import { Link, NavLink, Routes, Route, Navigate, Outlet, useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Standings from "./components/Standings";
import Fixtures from "./components/Fixtures";
import Team from "./views/Team";
import { getGroups } from "./lib/api";
import { FALLBACK_GROUPS } from "./config";
import Welcome from "./views/Welcome";
import "./App.css";

/* ---------- Small nav that respects ageId ---------- */
function TabNav({ ageId }) {
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
      <NavLink to={`/${ageId}/standings`} style={linkStyle}>Standings</NavLink>
      <NavLink to={`/${ageId}/fixtures`}  style={linkStyle}>Fixtures</NavLink>
    </nav>
  );
}

/* ---------- Top-level shell: loads groups, sets up routing ---------- */
export default function App() {
  const [groups, setGroups] = useState(FALLBACK_GROUPS); // [{id, label}]
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const gs = await getGroups();
        if (!alive || !gs.length) return;
        setGroups(gs.map(g => ({ id: g.id, label: g.label })));
      } catch (err) {
        console.error("getGroups failed", err);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const firstId = groups[0]?.id;

  if (!loaded && !groups.length) {
    return <div className="p-4" style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>Loading…</div>;
  }

  return (
  <Routes>
    {/* legacy links → send to first age */}
    <Route path="/standings" element={<Navigate to={`/${firstId}/standings`} replace />} />
    <Route path="/fixtures"  element={<Navigate to={`/${firstId}/fixtures`}  replace />} />

    {/* welcome at root */}
    <Route path="/" element={<Welcome groups={groups} />} />

    {/* age routes */}
    <Route path="/:ageId/*" element={<AgeLayout groups={groups} />} />

    {/* unknown → welcome */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
  );

}

/* ---------- Layout for any age route (/:ageId/*) ---------- */
function AgeLayout({ groups }) {
  const { ageId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Clamp ageId to a valid group
  const group = useMemo(() => {
    return groups.find(g => g.id === ageId) || groups[0];
  }, [groups, ageId]);

  // If URL ageId is unknown (e.g., typo), normalize to the first valid group
  if (!groups.some(g => g.id === ageId)) {
    return <Navigate to={`/${group.id}/standings`} replace />;
  }

  const onAgeChange = (e) => {
    const newId = e.target.value;
    const isFixtures = location.pathname.includes("/fixtures");
    navigate(`/${newId}/${isFixtures ? "fixtures" : "standings"}`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <header className="header">
        <div className="brand-row">
          <Link to="/" className="brand-link">
            <img src={`${import.meta.env.BASE_URL}hj_logo.jpg`} alt="HJ" className="brand-logo" />
            <span className="brand-title">HJ Indoor Season 2025</span>
          </Link>
        </div>

        <div className="controls-row">
          <Nav ageId={group.id} />
          <div className="age-chooser">
            <label className="age-label">Age</label>
            <select value={group.id} onChange={onAgeChange}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
        </div>
      </header>

      {/* nested routes for this age */}
      <Routes>
        <Route path="standings" element={<Standings ageId={group.id} ageLabel={group.label} />} />
        <Route path="fixtures"  element={<Fixtures  ageId={group.id} ageLabel={group.label} />} />
        <Route path="team/:name" element={<Team ageId={group.id} ageLabel={group.label} />} />
        {/* default under /:ageId → standings */}
        <Route index element={<Navigate to="standings" replace />} />
      </Routes>

      <footer className="footer">
        Data via Google Apps Script JSON • Route: {location.pathname}
      </footer>

      {/* Outlet is here if you later want deeper nesting */}
      <Outlet />
    </div>
  );
}