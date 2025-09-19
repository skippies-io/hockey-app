// src/views/Welcome.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome({ groups, firstId }) {
  const navigate = useNavigate();
  const [skipNextTime, setSkipNextTime] = useState(true);

  // Auto-bypass if they've seen it before
  useEffect(() => {
    const seen = localStorage.getItem("hj_seen_welcome") === "1";
    if (seen && firstId) navigate(`/${firstId}/standings`, { replace: true });
  }, [firstId, navigate]);

  const go = (path) => {
    if (skipNextTime) localStorage.setItem("hj_seen_welcome", "1");
    navigate(path);
  };

  const landingId = useMemo(() => firstId || groups?.[0]?.id, [firstId, groups]);

  return (
    <div className="welcome">
      <div className="welcome-card">
        <img
          src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
          alt="HJ Hockey for Juniors"
          className="welcome-logo"
        />
        <h1 className="welcome-title">HJ Indoor Season 2025</h1>
        <p className="welcome-sub">Live tables & fixtures for Johannesburg junior indoor hockey.</p>

        <div className="welcome-actions">
          <button className="btn-primary" onClick={() => go(`/${landingId}/standings`)}>View Standings</button>
          <button className="btn-secondary" onClick={() => go(`/${landingId}/fixtures`)}>View Fixtures</button>
        </div>

        <label className="welcome-skip">
          <input
            type="checkbox"
            checked={skipNextTime}
            onChange={e => setSkipNextTime(e.target.checked)}
          />
          Skip this screen next time
        </label>
      </div>
    </div>
  );
}
