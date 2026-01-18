import PropTypes from 'prop-types';
import { useNavigate } from "react-router-dom";

export default function Welcome({ groups = [] }) {
  const navigate = useNavigate();
  const defaultAgeId = groups[0]?.id || "U9M";

  const goFixtures = () => navigate(`/${defaultAgeId}/fixtures`);
  const goStandings = () => navigate(`/${defaultAgeId}/standings`);
  const goTeams = () => navigate(`/${defaultAgeId}/teams`);
  const goFeedback = () => navigate("/feedback");

  return (
    <div className="page-stack">
      <div className="page-section">
        <div className="hj-card welcome-card">
          <img
            src={`${import.meta.env.BASE_URL}HJ_icon_192.png`}
            alt="HJ Hockey For Juniors"
            className="welcome-logo"
          />
          <h1 className="welcome-title">HJ All Stars</h1>
          <p className="welcome-lead">Indoor Hockey • Season 2025</p>

          <p className="welcome-copy">
            Check fixtures, standings, and teams across all divisions.
          </p>

          <div className="welcome-actions">
            <button className="btn-primary" onClick={goFixtures}>
              View fixtures
            </button>
            <button className="btn-secondary" onClick={goStandings}>
              View standings
            </button>
            <button className="btn-secondary" onClick={goTeams}>
              Browse teams
            </button>
          </div>

          <div className="welcome-actions welcome-actions-secondary">
            <button className="btn-secondary" onClick={goFeedback}>
              Send feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

Welcome.propTypes = {
  groups: PropTypes.array,
};
