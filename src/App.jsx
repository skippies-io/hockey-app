import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, Link, NavLink, useParams, useLocation, useNavigate } from "react-router-dom";
import Standings from "./components/Standings";
import Fixtures from "./components/Fixtures";
import Team from "./views/Team";
import Welcome from "./views/Welcome";
import { getGroups } from "./lib/api";
import { FALLBACK_GROUPS } from "./config";
import "./App.css";

function Tabs({ ageId }) {
  const pill = ({ isActive }) => ({
    padding: "6px 10px",
    border: "1px solid #eee",
    borderRadius: 999,
    background: isActive ? "#eef2ff" : "#fafafa",
    textDecoration: "none",
    color: "#111",
  });
  return (
    <nav style={{ display: "flex", gap: 8 }}>
      <NavLink to={`/${ageId}/standings`} style={pill}>Standings</NavLink>
      <NavLink to={`/${ageId}/fixtures`}  style={pill}>Fixtures</NavLink>
    </nav>
  );
}

function AgeLayout({ groups }) {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ageIdUrl = params.ageId;

  const firstId = groups[0]?.id;
  const group = useMemo(
    () => groups.find(g => g.id === ageIdUrl) || (firstId ? groups[0] : null),
    [groups, ageIdUrl, firstId]
  );

  if (!group) return <div className="p-4">Loading…</div>;

  const onAgeChange = (e) => {
    const newId = e.target.value;
    const isFixtures = location.pathname.includes("/fixtures");
    navigate(`/${newId}/${isFixtures ? "fixtures" : "standings"}`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <header className="header">
        <div className="brand-row">
          <Link to="/" className="brand-link" aria-label="Home">
            <img
              src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
              alt="HJ Hockey for Juniors"
              className="brand-logo"
            />
            <span className="brand-title">HJ Indoor Season 2025</span>
          </Link>
        </div>

        <div className="controls-row">
          <Tabs ageId={group.id} />
          <div className="age-chooser">
            <label htmlFor="ageSelect" className="age-label">Age</label>
            <select id="ageSelect" value={group.id} onChange={onAgeChange}>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <Routes>
        <Route index element={<Navigate to={`/${group.id}/standings`} replace />} />
        <Route path="standings" element={<Standings ageId={group.id} ageLabel={group.label} />} />
        <Route path="fixtures"  element={<Fixtures  ageId={group.id} ageLabel={group.label} />} />
        <Route path="team/:name" element={<Team ageId={group.id} ageLabel={group.label} />} />
        <Route path="*" element={<div className="p-4">Not found</div>} />
      </Routes>

      <footer className="footer" style={{ padding: 12, textAlign: "center", color: "#666" }}>
        Data via Google Apps Script JSON • Route: {location.pathname}
      </footer>
    </div>
  );
}

export default function App() {
  const [groups, setGroups] = useState(FALLBACK_GROUPS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const gs = await getGroups();
        if (!alive) return;
        if (gs && gs.length) {
          setGroups(gs.map(g => ({ id: g.id, label: g.label })));
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    })();
    return () => { alive = false; };
  }, []);

  const firstId = groups[0]?.id || "U9M";

  return (
    <Routes>
      <Route path="/standings" element={<Navigate to={`/${firstId}/standings`} replace />} />
      <Route path="/fixtures"  element={<Navigate to={`/${firstId}/fixtures`}  replace />} />
      <Route path="/" element={<Welcome groups={groups} />} />
      <Route path="/:ageId/*" element={<AgeLayout groups={groups} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}