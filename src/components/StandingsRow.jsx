// src/components/StandingsRow.jsx
import React from "react";
import PropTypes from 'prop-types';

/**
 * StandingsRow
 * - Represents a single team row within a pool standings card.
 * - Clarity-first: rank, team, points and GD are easy to scan.
 *
 * Props:
 *  - rank: number
 *  - teamName: string | ReactNode
 *  - badgeColor: string (inline style background for .badge)
 *  - initials: string
 *  - played: number
 *  - won: number
 *  - drawn: number
 *  - lost: number
 *  - gf: number
 *  - ga: number
 *  - gd: number
 *  - points: number
 *  - isFollowed: boolean
 *  - onToggleFollow?: () => void
 */
export default function StandingsRow({
  rank,
  teamName,
  badgeColor,
  initials,
  played,
  won,
  drawn,
  lost,
  gf,
  ga,
  gd,
  points,
  isFollowed = false,
  onToggleFollow,
}) {
  return (
    <div className="stand-row">
      {/* Left: rank + team identity + follow star */}
      <div className="stand-row-main">
        <span className="rank-chip">{rank}</span>

        {onToggleFollow && (
          <button
            type="button"
            className="star-btn stand-row-star"
            aria-pressed={isFollowed}
            aria-label={isFollowed ? "Unfollow team" : "Follow team"}
            onClick={onToggleFollow}
          >
            <span className={`star ${isFollowed ? "is-on" : "is-off"}`}>
              {isFollowed ? "★" : "☆"}
            </span>
          </button>
        )}

        <div className="sc-team">
          <div className="badge" style={{ backgroundColor: badgeColor }}>
            {initials}
          </div>
          <div className="sc-name">{teamName}</div>
        </div>
      </div>

      {/* Right: compact stats (numbers only) */}
      <div className="stand-row-stats">
        <span className="sc-stat-value">{played}</span>
        <span className="sc-stat-value">{won}</span>
        <span className="sc-stat-value">{drawn}</span>
        <span className="sc-stat-value">{lost}</span>
        <span className="sc-stat-value">{gf}</span>
        <span className="sc-stat-value">{ga}</span>
        <span className="sc-stat-value">{gd}</span>
        <span className="sc-stat-value sc-stat-value--points">
          {points}
        </span>
      </div>
    </div>
  );
}

StandingsRow.propTypes = {
  rank: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  teamName: PropTypes.node.isRequired,
  badgeColor: PropTypes.string,
  initials: PropTypes.string,
  played: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  won: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  drawn: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lost: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  gf: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  ga: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  gd: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  points: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isFollowed: PropTypes.bool,
  onToggleFollow: PropTypes.func,
};
