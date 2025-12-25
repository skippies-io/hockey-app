import React, { useState } from "react";
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
  showResultPill = false,
  resultPill,
  expandable = false,
  notes,
}) {
  const statusKey = normalizeStatusKey(status);
  const pill = statusMeta[statusKey] || null;
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = showDate ? formatDate(date) : null;
  const timeLabel = time || "TBD";
  const timeVenueLine = [timeLabel, venueName].filter(Boolean).join(" • ");
  const metaLine = [showPool ? pool : null, showRound ? round : null]
    .filter(Boolean)
    .join(" • ");

  const renderScore = (v) =>
    v === null || v === undefined || v === "" ? "TBD" : String(v);

  const toggleExpand = (e) => {
    if (!expandable) return;
    if (e?.target?.closest?.("button, a")) return;
    setIsExpanded((prev) => !prev);
  };

  const onKeyToggle = (e) => {
    if (!expandable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

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
  const resultClass =
    resultPill === "W"
      ? "fixture-status--win"
      : resultPill === "D"
        ? "fixture-status--draw"
        : resultPill === "L"
          ? "fixture-status--loss"
          : "";

  return (
    <Card className="fixture-card fixture-card--canonical" noPad>
      <div
        className="fixture-card-shell"
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? isExpanded : undefined}
        onClick={expandable ? toggleExpand : undefined}
        onKeyDown={expandable ? onKeyToggle : undefined}
      >
        <div className="fixture-card-grid">
          <div className="fixture-grid-date">
            {formattedDate ? (
              <div className="fixture-card-date">{formattedDate}</div>
            ) : null}
            {pill ? (
              <div className={`fixture-card-status ${pill.className}`}>
                {pill.label}
              </div>
            ) : null}
          </div>

          <div className="fixture-grid-when">
            <div className="fixture-card-time">{timeVenueLine}</div>
          </div>

          {showResultPill && resultPill ? (
            <div className={`fixture-card-status ${resultClass} fixture-grid-result`}>
              {resultPill}
            </div>
          ) : null}

          <div className="fixture-grid-star1">
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
          </div>

          <div className="fixture-grid-team1">
            <div className="fixture-team-name">{homeTeam}</div>
          </div>

          <div className="fixture-team-score fixture-grid-score1">
            {renderScore(homeScore)}
          </div>

          <div className="fixture-grid-star2">
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
          </div>

          <div className="fixture-grid-team2">
            <div className="fixture-team-name">{awayTeam}</div>
          </div>

          <div className="fixture-team-score fixture-grid-score2">
            {renderScore(awayScore)}
          </div>
        </div>

        {metaLine ? <div className="fixture-card-meta">{metaLine}</div> : null}
        {expandable && isExpanded ? (
          <div className="fixture-card-details">
            {venueName ? (
              <div className="fixture-card-meta">Venue: {venueName}</div>
            ) : null}
            {pool ? <div className="fixture-card-meta">Pool: {pool}</div> : null}
            {round ? (
              <div className="fixture-card-meta">Round: {round}</div>
            ) : null}
            {notes ? <div className="fixture-card-meta">Notes: {notes}</div> : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
