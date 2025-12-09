// src/components/FixtureCard.jsx
import React from "react";

/**
 * FixtureCard
 * - Focuses on clarity first.
 * - Uses existing CSS hooks (.hj-card, .fixture-header, .fi-team-row, etc.)
 *
 * Props:
 *  - date: string (already formatted, e.g. "07 Dec 2025")
 *  - time: string | null (e.g. "15:30" or "TBC")
 *  - venueLabel: string (e.g. "Venue", "Pitch", "Field")
 *  - venueName: string
 *  - homeTeam: string
 *  - awayTeam: string
 *  - homeScore: number | null
 *  - awayScore: number | null
 *  - status: "upcoming" | "live" | "final" | null
 *  - homeIsFollowed: boolean
 *  - awayIsFollowed: boolean
 *  - onToggleHomeFollow: () => void
 *  - onToggleAwayFollow: () => void
 *  - isFollowed: boolean (legacy single-star support)
 *  - onToggleFollow: () => void (legacy single-star support)
 */
export default function FixtureCard({
  date,
  time,
  venueLabel = "Venue",
  venueName,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status = null,
  homeIsFollowed = false,
  awayIsFollowed = false,
  onToggleHomeFollow,
  onToggleAwayFollow,
  isFollowed = false,
  onToggleFollow,
}) {
  const hasScores =
    typeof homeScore === "number" && typeof awayScore === "number";
  const showHeaderStar = !onToggleHomeFollow && !onToggleAwayFollow && !!onToggleFollow;

  const renderScore = (score) => {
    if (!hasScores) {
      // Keep TBD aligned with where the score would be, but as text
      return <span className="fi-score">TBD</span>;
    }
    return <span className="fi-score">{score}</span>;
  };

  const renderStatus = () => {
    if (!status) return null;

    let label = "";
    if (status === "live") label = "Live";
    else if (status === "final") label = "Final";
    else if (status === "upcoming") label = "Upcoming";

    if (!label) return null;

    return (
      <span className="fixture-item-meta">
        {label}
      </span>
    );
  };

  const renderFollowStar = (isOn, handler, ariaLabel) => {
    if (!handler) return null;
    return (
      <button
        type="button"
        className="star-btn"
        aria-pressed={isOn}
        aria-label={ariaLabel}
        onClick={handler}
      >
        <span className={`star ${isOn ? "is-on" : "is-off"}`}>
          {isOn ? "★" : "☆"}
        </span>
      </button>
    );
  };

  return (
    <article className="hj-card fixture-card">
      {/* Header: date + meta */}
      <header className="fixture-header">
        <div className="fixture-header-left">
          <div className="fixture-date">{date}</div>
          <div className="fixture-meta">
            {time && <span className="fi-time">{time}</span>}
            {venueName && (
              <>
                {time && " \u00b7 "}
                <span>
                  {venueLabel}: {venueName}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="fixture-header-right">
          {renderStatus()}
          {showHeaderStar &&
            renderFollowStar(
              isFollowed,
              onToggleFollow,
              isFollowed ? "Unfollow team" : "Follow team"
            )}
        </div>
      </header>

      {/* Body: teams + scores, vertically aligned for clarity */}
      <div className="fixture-body">
        <div className="fixture-body-left">
          <div className="fi-team-rows">
            <div className="fi-team-row">
              <div className="fi-team-main">
                {renderFollowStar(
                  onToggleHomeFollow ? homeIsFollowed : isFollowed,
                  onToggleHomeFollow,
                  (onToggleHomeFollow ? homeIsFollowed : isFollowed)
                    ? "Unfollow team"
                    : "Follow team"
                )}
                <span className="teams teams--home">{homeTeam}</span>
              </div>
              {renderScore(homeScore)}
            </div>

            <div className="fi-team-row">
              <div className="fi-team-main">
                {renderFollowStar(
                  onToggleAwayFollow ? awayIsFollowed : isFollowed,
                  onToggleAwayFollow,
                  (onToggleAwayFollow ? awayIsFollowed : isFollowed)
                    ? "Unfollow team"
                    : "Follow team"
                )}
                <span className="teams teams--away">{awayTeam}</span>
              </div>
              {/* Spacer keeps TBD / scores aligned between rows */}
              {hasScores ? (
                renderScore(awayScore)
              ) : (
                <span className="fi-score fi-time--spacer">TBD</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
