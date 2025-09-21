import { Link } from "react-router-dom";

export default function Welcome({ groups = [] }) {
  const firstId = groups[0]?.id || "U9M";

  return (
    <div className="welcome">
      <div className="welcome-card">
        <img
          src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
          alt="HJ Hockey for Juniors"
          className="welcome-logo"
        />
        <h1 className="welcome-title">HJ Indoor Season 2025</h1>
        <p className="welcome-lead">
          Welcome to the unofficial HJ Indoor Hockey fixtures and standings site.
        </p>
        <div className="welcome-copy">
          <p>Pick an age group, browse fixtures, and track pool standings.</p>
          <p>Use the ★ to follow teams—followed teams are highlighted in both fixtures and standings.</p>
          <p>
            We’re just getting started — feedback is welcome. You can send feedback directly in the app using the form below.
          </p>
        </div>

        <div className="welcome-actions">
          <Link className="btn-primary" to={`/${firstId}/standings`}>Start browsing</Link>
          <Link className="btn-secondary" to="/feedback">Send feedback</Link>
        </div>
      </div>
    </div>
  );
}