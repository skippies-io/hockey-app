// src/views/Welcome.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function Welcome({ groups }) {
  const navigate = useNavigate();
  const firstId = useMemo(() => groups?.[0]?.id || "U9M", [groups]);

  return (
    <div className="welcome">
      <div className="welcome-card">
        <img
          src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
          alt="HJ Hockey for Juniors"
          className="welcome-logo"
        />
        <h1 className="welcome-title">Welcome 👋</h1>
        <p className="welcome-lead">
          This is the <strong>HJ Indoor Hockey</strong> fixtures & standings site.
        </p>

        <div className="welcome-copy">
          <p>
            • Browse <strong>live tables</strong> and <strong>weekly fixtures</strong> for each age group.
          </p>
          <p>
            • Tap the <strong>☆ star</strong> next to a team to <strong>favourite</strong> it—followed teams are
            highlighted across the app and you can filter to “Only followed”.
          </p>
          <p>
            • Share direct links like <em>/U13B/fixtures</em> with coaches and parents for quick access.
          </p>
          <p>
            We’re just getting started—feedback is welcome (we’ll add a feedback form here later).
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => navigate(`/${firstId}/standings`)}
        >
          Get started
        </button>
      </div>
    </div>
  );
}