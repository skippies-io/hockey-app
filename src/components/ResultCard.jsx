import PropTypes from 'prop-types';

// teamA/teamB accept strings or React nodes so callers can pass links
export default function ResultCard({ dateTime, teamA, teamB, meta, score, resultBadge }) {
  return (
    <article className="tp-card">
      <div className="tp-card-head">
        <div className="tp-card-date">{dateTime}</div>
        {resultBadge && (
          <span
            className={`tp-pill ${
              resultBadge === "W"
                ? "pill-win"
                : resultBadge === "D"
                  ? "pill-draw"
                  : "pill-loss"
            }`}
          >
            {resultBadge}
          </span>
        )}
      </div>
      <div className="tp-card-body">
        <div className="tp-card-names">
          <div className="tp-card-team">{teamA}</div>
          <div className="tp-card-team is-ghost">{teamB}</div>
          <div className="tp-card-meta">{meta}</div>
        </div>
        <div className="tp-card-score">{score}</div>
      </div>
    </article>
  );
}

ResultCard.propTypes = {
  dateTime: PropTypes.string,
  teamA: PropTypes.node.isRequired,
  teamB: PropTypes.node.isRequired,
  meta: PropTypes.string,
  score: PropTypes.string,
  resultBadge: PropTypes.oneOf(['W', 'D', 'L']),
};
