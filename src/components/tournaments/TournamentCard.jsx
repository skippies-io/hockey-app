import { Link } from "react-router-dom";

const STATUS_LABELS = {
  live: "Live",
  upcoming: "Upcoming",
  past: "Past",
};

const STATUS_CLASS = {
  live: "status-live",
  upcoming: "status-upcoming",
  past: "status-past",
};

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Dates TBA";
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" });
  if (start && end) {
    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameMonth && sameYear) {
      return `${fmt.format(start)}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${fmt.format(start)} – ${fmt.format(end)}, ${end.getFullYear()}`;
  }
  if (start) return fmt.format(start);
  return fmt.format(end);
}

export default function TournamentCard({ tournament }) {
  const status = tournament?.derivedStatus || tournament?.status || "upcoming";
  const statusLabel = STATUS_LABELS[status] || status;
  const dateLabel = formatDateRange(tournament?.startDate, tournament?.endDate);
  const location = [tournament?.venueName, tournament?.city].filter(Boolean).join(" • ");

  return (
    <article className="t-card">
      <div className="t-card__chip">
        <span className={`status-chip ${STATUS_CLASS[status] || "status-upcoming"}`}>{statusLabel}</span>
      </div>
      <h3 className="t-card__title">{tournament?.name || "Unnamed tournament"}</h3>
      <p className="t-card__meta">{dateLabel}</p>
      <p className="t-card__meta">{location || "Venue TBA"}</p>
      <p className="t-card__host">Hosted by {tournament?.hostClub || "Unknown club"}</p>
      <Link className="t-card__cta" to={`/tournaments/${tournament?.slug}`}>View details →</Link>
    </article>
  );
}
