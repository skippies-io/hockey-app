import React from "react";
import Card from "./Card";
import { formatFixtureDate } from "../lib/date";

// NOTE: We deliberately *do not* show pills for "final" or "upcoming".
// Pills are reserved for exceptional states (live, postponed, cancelled, tbc).
const statusMeta = {
  live: { label: "Live", className: "fixture-status--live" },
  postponed: { label: "Postponed", className: "fixture-status--warn" },
  cancelled: { label: "Cancelled", className: "fixture-status--danger" },
  tbc: { label: "TBC", className: "fixture-status--muted" },
};

function formatDate(raw) {
  return formatFixtureDate(raw);
}

function normalizeStatusKey(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  return s || "upcoming";
}

export default function FixtureCard({
  date,
  time,
  venueName,
  pool,
  round,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  homeIsFollowed,
  awayIsFollowed,
  onToggleHomeFollow,
  onToggleAwayFollow,
  showDate = true,
  showPool = true,
  showRound = false,
}) {
  const statusKey = normalizeStatusKey(status);
  const pill = statusMeta[statusKey] || null;

  const formattedDate = showDate ? formatDate(date) : null;
  const timeLabel = time || "TBD";
  const timeVenueLine = [timeLabel, venueName].filter(Boolean).join(" • ");
  const metaLine = [showPool ? pool : null, showRound ? round : null]
    .filter(Boolean)
    .join(" • ");

  const renderScore = (v) =>
    v === null || v === undefined || v === "" ? "TBD" : String(v);

  const onStarClick = (e, fn) => {
    e.preventDefault();
    e.stopPropagation();
    fn?.();
  };

  const teamNameForAria = (node) => {
    // If caller passes a <Link> with text, aria-label can still be generic.
    // Best effort: fall back to a generic label if we can't reliably extract text.
    if (typeof node === "string") return node;
    return "team";
  };

  const homeName = teamNameForAria(homeTeam);
  const awayName = teamNameForAria(awayTeam);

  return (
    <Card className="fixture-card fixture-card--canonical" noPad>
      <div className="fixture-card-shell">
        <div className="fixture-card-head">
          <div className="fixture-card-when">
            {formattedDate ? (
              <div className="fixture-card-date">{formattedDate}</div>
            ) : null}
            <div className="fixture-card-time">{timeVenueLine}</div>
          </div>

          {pill ? (
            <div className={`fixture-card-status ${pill.className}`}>
              {pill.label}
            </div>
          ) : null}
        </div>

        {metaLine ? <div className="fixture-card-meta">{metaLine}</div> : null}

        <div className="fixture-teams fixture-teams--aligned">
          <div className="fixture-team-row">
            <div className="fixture-team-main">
              <button
                type="button"
                className="star-btn fixture-star"
                aria-label={
                  homeIsFollowed ? `Unfollow ${homeName}` : `Follow ${homeName}`
                }
                aria-pressed={!!homeIsFollowed}
                onClick={(e) => onStarClick(e, onToggleHomeFollow)}
              >
                <span className={`star ${homeIsFollowed ? "is-on" : "is-off"}`}>
                  {homeIsFollowed ? "★" : "☆"}
                </span>
              </button>

              <div className="fixture-team-name">{homeTeam}</div>
            </div>

            <div className="fixture-team-score">{renderScore(homeScore)}</div>
          </div>

          <div className="fixture-team-row">
            <div className="fixture-team-main">
              <button
                type="button"
                className="star-btn fixture-star"
                aria-label={
                  awayIsFollowed ? `Unfollow ${awayName}` : `Follow ${awayName}`
                }
                aria-pressed={!!awayIsFollowed}
                onClick={(e) => onStarClick(e, onToggleAwayFollow)}
              >
                <span className={`star ${awayIsFollowed ? "is-on" : "is-off"}`}>
                  {awayIsFollowed ? "★" : "☆"}
                </span>
              </button>

              <div className="fixture-team-name">{awayTeam}</div>
            </div>

            <div className="fixture-team-score">{renderScore(awayScore)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
