import { Link } from "react-router-dom";

export default function Welcome({ groups = [] }) {
  const firstId = groups[0]?.id || "U9M";

  return (
    <div className="welcome">
      <div className="welcome-card">
        <img
          src={`${import.meta.env.BASE_URL}hj_logo.jpg`}
          alt="HJ Hockey For Juniors"
          className="welcome-logo"
        />
        <h1 className="welcome-title">Hockey For Juniors</h1>
        <p className="welcome-lead" align="left">
          Welcome to the Hockey For Juniors web app where you can find the latest fixtures, standings, and news of your favourite team or franchise.
        </p>
        <div className="welcome-copy">
          <ul>
            <li>Live fixtures and standings for Hockey For Juniors tournaments.</li>
            <li>Follow your favourite teams and get notified of their upcoming matches.</li>
            <li>Stay updated with the latest news and announcements from Hockey For Juniors.</li>
          </ul>
          <h2>Getting Started</h2>
          <p align="left">Pick an age group, browse fixtures, and track pool standings.</p>
          <p align="left">Use the ★ to follow teams—followed teams are highlighted in both fixtures and standings.</p>
          <p align="left">Send feedback via the link below to help improve the app!</p>
        </div>

        <div className="welcome-actions">
          <Link className="btn-primary" to={`/${firstId}/fixtures`}>Launch</Link>
          <Link className="btn-secondary" to="/feedback">Send feedback</Link>
        </div>
      </div>
    </div>
  );
}