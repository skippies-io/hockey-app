import Card from "./Card";

export default function FixtureItem({
  mode = "upcoming",
  date,
  time,
  venue,
  meta,
  homeTeam,
  awayTeam,
  homePrefix = null,
  awayPrefix = null,
  score1 = "",
  score2 = "",
  followed = false,
  className = "",
}) {
  const metaLine = meta || venue || "";

  return (
    <Card
      followed={followed}
      className={[
        "fixture-card",
        "fixture-item",
        className || "",
      ].filter(Boolean).join(" ")}
    >
      <div className="fixture-header">
        <div className="fixture-header-left">
          {date && <div className="fixture-date">{date}</div>}
          {metaLine && <div className="fixture-meta">{metaLine}</div>}
        </div>
      </div>

      <div className="fixture-body">
        <div className="fixture-body-left">
          <div className="fi-team-rows">
            <div className="fi-team-row">
              <div className="fi-team-main">
                {homePrefix}
                <span className="team-name">{homeTeam}</span>
              </div>
              {mode === "result" ? (
                <div className="fi-score">{score1 || "—"}</div>
              ) : (
                <div className="fi-time">{time}</div>
              )}
            </div>

            <div className="fi-team-row">
              <div className="fi-team-main">
                {awayPrefix}
                <span className="team-name">{awayTeam}</span>
              </div>
              {mode === "result" ? (
                <div className="fi-score">{score2 || "—"}</div>
              ) : (
                <div className="fi-time fi-time--spacer" />
              )}
            </div>
          </div>

          {venue && <div className="fixture-item-meta">{venue}</div>}
        </div>
      </div>
    </Card>
  );
}
