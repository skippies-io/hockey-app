import { Link } from "react-router-dom";
import { CARD_TYPES } from "../../lib/overviewTypes";

const DEFAULT_CARD = {
  headline: "Untitled",
  subtext: "",
};

function CardShell({ children, badge, action, className = "" }) {
  return (
    <div className={`overview-card ${className}`}>
      <div className="overview-card__body">
        {children}
      </div>
      {badge ? <span className="overview-card__badge">{badge}</span> : null}
      {action ? <div className="overview-card__action">{action}</div> : null}
    </div>
  );
}

function FollowButton({ followed, onClick }) {
  return (
    <button className="follow-btn" onClick={onClick} aria-pressed={followed}>
      {followed ? "★ Following" : "☆ Follow"}
    </button>
  );
}

export default function OverviewCard({ card = DEFAULT_CARD, onFollowToggle, isFollowing }) {
  const type = card.type || CARD_TYPES.FIXTURE;
  switch (type) {
    case CARD_TYPES.STANDING:
      return (
        <CardShell className="standing-card">
          <div className="card-title">{card.headline}</div>
          <div className="card-subtext">{card.subtext}</div>
          <div className="card-metrics">
            <span>Pts: {card.metrics?.points ?? "—"}</span>
            <span>GD: {card.metrics?.gd ?? "—"}</span>
          </div>
        </CardShell>
      );
    case CARD_TYPES.ANNOUNCEMENT:
      return (
        <CardShell className={`announcement-card announcement-${card.severity || "info"}`}>
          <div className="card-title">{card.title || card.headline}</div>
          <p>{card.message || card.subtext}</p>
          <div className="card-meta">
            {card.postedAt ? <span>Posted {new Date(card.postedAt).toLocaleString()}</span> : null}
            {card.expiresAt ? <span>Expires {new Date(card.expiresAt).toLocaleString()}</span> : null}
          </div>
        </CardShell>
      );
    case CARD_TYPES.AWARD:
      return (
        <CardShell className="award-card" badge={card.award}>
          <div className="card-title">{card.headline}</div>
          <div className="card-subtext">{card.subtext}</div>
        </CardShell>
      );
    case CARD_TYPES.ALERT:
      return (
        <CardShell className="alert-card" badge={card.alertType?.toUpperCase()}>
          <div className="card-title">{card.headline}</div>
          <div className="card-subtext">{card.message || card.subtext}</div>
          <div className="card-meta">
            {card.flaggedBy ? <span>Flagged by {card.flaggedBy}</span> : null}
            {card.updatedAt ? <span>Updated {new Date(card.updatedAt).toLocaleString()}</span> : null}
          </div>
        </CardShell>
      );
    case CARD_TYPES.FIXTURE:
    default:
      return (
        <CardShell
          className="fixture-card"
          badge={card.statusBadge}
          action={
            card.links?.deep ? (
              <Link to={card.links.deep}>Open</Link>
            ) : null
          }
        >
          <div className="card-title">{card.headline}</div>
          <div className="card-subtext">{card.subtext}</div>
          <div className="card-meta">
            {card.metrics?.round ? <span>{card.metrics.round}</span> : null}
            {card.metrics?.venue ? <span>{card.metrics.venue}</span> : null}
          </div>
          {typeof isFollowing === "function" ? (
            <FollowButton
              followed={isFollowing(card.trackId || card.entityId)}
              onClick={() => onFollowToggle?.(card.trackId || card.entityId)}
            />
          ) : null}
        </CardShell>
      );
  }
}
