import React, { useState } from "react";
import PropTypes from 'prop-types';
import Card from "./Card";
import { formatFixtureDate } from "../lib/date";

// Status pills: only exceptional states get a visual badge in the top row.
// "final" and "upcoming" are intentionally excluded per product decision.
const STATUS_META = {
  live:      { label: "Live",      className: "fixture-status--live" },
  postponed: { label: "Postponed", className: "fixture-status--warn" },
  cancelled: { label: "Cancelled", className: "fixture-status--danger" },
  tbc:       { label: "TBC",       className: "fixture-status--muted" },
};

function normalizeStatusKey(status) {
  return String(status || "").trim().toLowerCase() || "upcoming";
}

function renderScore(v) {
  return v === null || v === undefined || v === "" ? "TBD" : String(v);
}

// Returns the accent-strip variant class for the card based on the result pill.
function accentClass(resultPill, showResultPill) {
  if (!showResultPill || !resultPill) return "";
  if (resultPill === "W") return "fixture-v2--win";
  if (resultPill === "L") return "fixture-v2--loss";
  if (resultPill === "D") return "fixture-v2--draw";
  return "";
}

// Human-readable label for a given team node, used in aria attributes.
function teamAriaName(node) {
  if (typeof node === "string") return node;
  return "team";
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
  alertMessage,
}) {
  const statusKey = normalizeStatusKey(status);
  const pill = STATUS_META[statusKey] || null;
  const isLive = statusKey === "live";
  const isFinal = statusKey === "final";
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = showDate ? formatFixtureDate(date) : null;
  const timeLabel = time || "TBD";

  const resultBadgeVariant =
    resultPill === "W" ? "win" :
    resultPill === "L" ? "loss" :
    resultPill === "D" ? "draw" : null;

  const accent = accentClass(resultPill, showResultPill);
  const liveAccent = isLive ? "fixture-v2--live" : "";

  const homeName = teamAriaName(homeTeam);
  const awayName = teamAriaName(awayTeam);

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

  return (
    <Card className={`fixture-card fixture-card--canonical fixture-card--v2 ${accent} ${liveAccent}`} noPad>
      <div
        className="fixture-card-shell"
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? isExpanded : undefined}
        aria-label={expandable ? `${homeName} vs ${awayName} — tap to ${isExpanded ? "collapse" : "expand"} details` : undefined}
        onClick={expandable ? toggleExpand : undefined}
        onKeyDown={expandable ? onKeyToggle : undefined}
      >
        {/* ── Top row: status pill, date, alert ── */}
        {(pill || formattedDate || alertMessage) && (
          <div className="fixture-v2-top">
            <div style={{ display: "flex", alignItems: "center", gap: "var(--hj-space-2)", flexWrap: "wrap" }}>
              {isLive ? (
                <span className={`fixture-card-status fixture-status--live`}>
                  <span className="fixture-v2-live-dot" aria-hidden="true" />
                  {pill.label}
                </span>
              ) : pill ? (
                <span className={`fixture-card-status ${pill.className}`}>{pill.label}</span>
              ) : null}
              {formattedDate && (
                <span className="fixture-card-date" style={{ fontSize: "var(--hj-font-size-xs)", color: "var(--hj-color-ink-subtle)" }}>
                  {formattedDate}
                </span>
              )}
            </div>
            {alertMessage && <div className="fixture-card-alert">{alertMessage}</div>}
          </div>
        )}

        {/* ── Main matchup row ── */}
        <div className="fixture-v2-matchup">
          {/* Home team */}
          <div className="fixture-v2-team fixture-v2-team--home">
            <div className="fixture-v2-team-name fixture-team-name">{homeTeam}</div>
            <div className="fixture-v2-team-star">
              <button
                type="button"
                className="star-btn fixture-star"
                aria-label={homeIsFollowed ? `Unfollow ${homeName}` : `Follow ${homeName}`}
                aria-pressed={!!homeIsFollowed}
                onClick={(e) => onStarClick(e, onToggleHomeFollow)}
              >
                <span className={`star ${homeIsFollowed ? "is-on" : "is-off"}`}>
                  {homeIsFollowed ? "★" : "☆"}
                </span>
              </button>
            </div>
          </div>

          {/* Score center */}
          <div className="fixture-v2-score-block">
            {showResultPill && resultBadgeVariant && (
              <span className={`fixture-v2-result-badge fixture-v2-result-badge--${resultBadgeVariant}`}>
                {resultPill}
              </span>
            )}
            <div className="fixture-v2-score-row">
              {/* NOTE: .fixture-team-score kept for test compatibility */}
              <span className="fixture-team-score">{renderScore(homeScore)}</span>
              <span className="fixture-v2-score-sep" aria-hidden="true">–</span>
              <span className="fixture-team-score">{renderScore(awayScore)}</span>
            </div>
            {isFinal && (
              <span className="fixture-v2-time-label">Full Time</span>
            )}
          </div>

          {/* Away team */}
          <div className="fixture-v2-team fixture-v2-team--away">
            <div className="fixture-v2-team-name fixture-team-name">{awayTeam}</div>
            <div className="fixture-v2-team-star" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="star-btn fixture-star"
                aria-label={awayIsFollowed ? `Unfollow ${awayName}` : `Follow ${awayName}`}
                aria-pressed={!!awayIsFollowed}
                onClick={(e) => onStarClick(e, onToggleAwayFollow)}
              >
                <span className={`star ${awayIsFollowed ? "is-on" : "is-off"}`}>
                  {awayIsFollowed ? "★" : "☆"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Meta row: time • venue • pool ── */}
        <div className="fixture-v2-meta">
          {/* .fixture-card-time kept for test compatibility — preserves "HH:MM • Venue" format */}
          <span className="fixture-card-time">
            {[timeLabel, venueName].filter(Boolean).join(" • ")}
          </span>
          {showPool && pool && (
            <>
              <span className="fixture-v2-meta-sep" aria-hidden="true" />
              <span>{pool}</span>
            </>
          )}
          {showRound && round && (
            <>
              <span className="fixture-v2-meta-sep" aria-hidden="true" />
              <span>{round}</span>
            </>
          )}
        </div>

        {/* ── Expandable detail section ── */}
        {expandable && isExpanded && (
          <div className="fixture-v2-details fixture-card-details">
            {venueName && <div className="fixture-card-meta">Venue: {venueName}</div>}
            {pool && <div className="fixture-card-meta">Pool: {pool}</div>}
            {round && <div className="fixture-card-meta">Round: {round}</div>}
            {notes && <div className="fixture-card-meta">Notes: {notes}</div>}
          </div>
        )}
      </div>
    </Card>
  );
}

FixtureCard.propTypes = {
  date: PropTypes.string,
  time: PropTypes.string,
  venueName: PropTypes.string,
  pool: PropTypes.string,
  round: PropTypes.string,
  homeTeam: PropTypes.node.isRequired,
  awayTeam: PropTypes.node.isRequired,
  homeScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  awayScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  status: PropTypes.string,
  homeIsFollowed: PropTypes.bool,
  awayIsFollowed: PropTypes.bool,
  onToggleHomeFollow: PropTypes.func,
  onToggleAwayFollow: PropTypes.func,
  showDate: PropTypes.bool,
  showPool: PropTypes.bool,
  showRound: PropTypes.bool,
  showResultPill: PropTypes.bool,
  resultPill: PropTypes.oneOf(["W", "D", "L"]),
  expandable: PropTypes.bool,
  notes: PropTypes.string,
  alertMessage: PropTypes.string,
};
