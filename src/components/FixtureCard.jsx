import React from "react";
import Card from "./Card";

const MONTH = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_IDX = new Map(
  MONTH.map((name, idx) => [name.toLowerCase(), idx])
);

const statusMeta = {
  live: { label: "Live", className: "fixture-status--live" },
  final: { label: "Final", className: "fixture-status--final" },
  postponed: { label: "Postponed", className: "fixture-status--warn" },
  cancelled: { label: "Cancelled", className: "fixture-status--danger" },
  tbc: { label: "TBC", className: "fixture-status--muted" },
  upcoming: { label: "Upcoming", className: "fixture-status--upcoming" },
};

function formatDate(raw) {
  const m = String(raw || "")
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return raw || "Date TBD";
  const day = m[1].padStart(2, "0");
  const monthIdx = MONTH_IDX.get(m[2].toLowerCase());
  const year = m[3];
  if (monthIdx == null) return raw;
  return `${day} ${MONTH[monthIdx]} ${year}`;
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
}) {
  const statusKey = (status || "").toString().trim().toLowerCase();
  const meta = statusMeta[statusKey] || statusMeta.upcoming;
  const statusLabel = meta.label;
  const statusClass = meta.className;
  const formattedDate = showDate ? formatDate(date) : null;
  const timeLabel = time || "TBD";
  const metaLine = [pool, venueName, round].filter(Boolean).join(" • ");

  const renderScore = (v) =>
    v === null || v === undefined || v === "" ? "TBD" : String(v);

  const onStarClick = (e, fn) => {
    e.preventDefault();
    e.stopPropagation();
    fn?.();
  };

  return (
    <Card className="fixture-card fixture-card--canonical" noPad>
      <div className="fixture-card-shell">
        <div className="fixture-card-head">
          <div className="fixture-card-when">
            {formattedDate ? (
              <div className="fixture-card-date">{formattedDate}</div>
            ) : null}
            <div className="fixture-card-time">{timeLabel}</div>
          </div>
          <div className={`fixture-card-status ${statusClass}`}>
            {statusLabel}
          </div>
        </div>

        {metaLine ? <div className="fixture-card-meta">{metaLine}</div> : null}

        <div className="fixture-teams fixture-teams--aligned">
          <div className="fixture-team-row">
            <div className="fixture-team-main">
              <button
                type="button"
                className="star-btn fixture-star"
                aria-label={homeIsFollowed ? "Unfollow team" : "Follow team"}
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
                aria-label={awayIsFollowed ? "Unfollow team" : "Follow team"}
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
