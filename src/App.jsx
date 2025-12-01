import { useEffect, useMemo, useState } from "react";
import {
  Routes, Route, Navigate, Link, NavLink,
  useParams, useLocation, useNavigate
} from "react-router-dom";

import Standings from "./components/Standings";
import Fixtures from "./components/Fixtures";
import Team from "./views/Team";
import Welcome from "./views/Welcome";
import Feedback from "./views/Feedback";
import InstallPrompt from "./components/InstallPrompt.jsx";

import { getGroups, getFixturesRows, getStandingsRows } from "./lib/api";
import { FALLBACK_GROUPS } from "./config";

import "./App.css";

// --- GA helpers ---
import { trackPageView, trackEvent } from "./lib/analytics";

// Use BASE_URL so this works on GitHub Pages subpath (/hockey-app/)
const hjLogoUrl = import.meta.env.BASE_URL + "hj_logo.jpg";

/* Sort by numeric age (U9 < U11 < …), then Boys, Girls, Mixed */
const GROUP_ORDER = { B: 0, G: 1, M: 2, X: 3 };
function sortAgeGroups(a, b) {
  const na = +(a.id.match(/^U(\d+)/)?.[1] || 0);
  const nb = +(b.id.match(/^U(\d+)/)?.[1] || 0);
  if (na !== nb) return na - nb;
  const ca = a.id.slice(-1);
  const cb = b.id.slice(-1);
  return (GROUP_ORDER[ca] ?? 9) - (GROUP_ORDER[cb] ?? 9);
}

/* --- Small nav for the two main tabs --- */
function Tabs({ ageId }) {
  const cls = ({ isActive }) => "pill" + (isActive ? " is-active" : "");
  return (
    <nav className="pills">
      <NavLink to={`/${ageId}/fixtures`}  className={cls}>Fixtures</NavLink>
      <NavLink to={`/${ageId}/standings`} className={cls}>Standings</NavLink>
    </nav>
  );
}

/* --- Layout for /:ageId/* --- */
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

  /* Prefetch the data for the selected age to warm caches */
  useEffect(() => {
    if (!group?.id) return;
    getStandingsRows(group.id).catch(() => {});
    getFixturesRows(group.id).catch(() => {});
  }, [group?.id]);

  if (!group) return <div className="p-4">Loading…</div>;

  const onAgeChange = (e) => {
    const newId = e.target.value;
    const isFixtures = location.pathname.includes("/fixtures");
    trackEvent("select_content", { content_type: "age_group", item_id: newId });
    navigate(`/${newId}/${isFixtures ? "fixtures" : "standings"}`);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <header className="header">
        <div className="brand-row">
          <Link to="/" className="brand-link" aria-label="Home">
            <img src={hjLogoUrl} alt="HJ Hockey for Juniors" className="brand-logo" />
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
        <Route path="feedback" element={<Feedback />} /> {/* scoped feedback */}
        <Route path="*" element={<div className="p-4">Not found</div>} />
      </Routes>

      <footer className="footer" style={{ padding: 12, textAlign: "center", color: "#666" }}>
        Data via Google Apps Script JSON • Route: {location.pathname} •{" "}
        <Link to={`/${group.id}/feedback`}>Feedback</Link>
      </footer>
    </div>
  );
}

/* --- Top-level app: load groups, wire routes + InstallPrompt --- */
export default function App() {
  const [groups, setGroups] = useState(FALLBACK_GROUPS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const gs = await getGroups();
        if (!alive) return;
        if (gs && gs.length) {
          const sorted = gs.map(g => ({ id: g.id, label: g.label })).sort(sortAgeGroups);
          setGroups(sorted);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    })();
    return () => { alive = false; };
  }, []);

  const firstId = groups[0]?.id || "U9M";

  const location = useLocation();
  useEffect(() => {
    console.log("[GA] location change ->", location.pathname + location.hash); // TEMP LOG
    trackPageView();
  }, [location]);


  return (
    <>
      <Routes>
        {/* Legacy direct paths → redirect to first age */}
        <Route path="/standings" element={<Navigate to={`/${firstId}/standings`} replace />} />
        <Route path="/fixtures"  element={<Navigate to={`/${firstId}/fixtures`}  replace />} />

        {/* Welcome at root */}
        <Route path="/" element={<Welcome groups={groups} />} />

        {/* Age-scoped UI */}
        <Route path="/:ageId/*" element={<AgeLayout groups={groups} />} />

        {/* Global feedback (no age context) */}
        <Route path="/feedback" element={<Feedback />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* PWA install helper */}
      <InstallPrompt />
    </>
  );
}
