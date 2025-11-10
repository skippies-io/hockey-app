import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useOverviewFeed } from "./useOverviewFeed.js";
import DigestBuilder from "./DigestBuilder.jsx";
import { useFollows } from "../../lib/follows.js";
import { OverviewCard, SeasonSwitcher } from "../../components/overview";
import { CARD_TYPES, groupCardsByType } from "../../lib/overviewTypes.js";

export default function Overview() {
  const { overview, loading, error, season, setSeason, refresh, lastUpdated, availableSeasons } = useOverviewFeed();
  const { isFollowing, toggleFollow } = useFollows();
  const logoUrl = import.meta.env.BASE_URL + "hj_logo.jpg";

  const cardsByType = useMemo(() => groupCardsByType(overview?.cards || []), [overview]);
  const announcements = (overview?.announcements?.length ? overview.announcements : cardsByType[CARD_TYPES.ANNOUNCEMENT]) || [];
  const fixtureCards = cardsByType[CARD_TYPES.FIXTURE] || [];
  const standingCards = cardsByType[CARD_TYPES.STANDING] || [];
  const followedCards = fixtureCards.filter(card => card.followed || isFollowing(card.trackId || card.entityId));

  return (
    <div className="overview-shell">
      <div className="overview-hero card">
        <div className="hero-left">
          <img src={logoUrl} alt="HJ Hockey for Juniors" className="overview-logo" />
          <div>
            <p className="eyebrow">Hockey4Juniors</p>
            <h1>Season snapshot</h1>
            <p className="lead">
              Follow fixtures, standings, announcements, and awards from every division in one place.
              {lastUpdated ? ` Last synced ${new Date(lastUpdated).toLocaleString()}.` : " Syncing latest data…"}
            </p>
            {error ? <p className="text-error">Unable to reach live data. Serving cached information.</p> : null}
          </div>
        </div>
        <div className="hero-actions">
          <div className="season-row">
            <SeasonSwitcher season={season} availableSeasons={availableSeasons} onChange={setSeason} />
            <button onClick={refresh}>Refresh</button>
          </div>
        </div>
      </div>

      {/* Digest builder temporarily hidden per request */}
      {/* <div className="card section-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Personalize</p>
            <h2>Digest Builder</h2>
          </div>
          <p>Create a sharable digest and calendar export in one step.</p>
        </div>
        <DigestBuilder overview={overview} />
      </div> */}

      <div className="overview-grid">
        <div className="col">
          <SectionBlock title="Announcements">
            {announcements.length === 0
              ? <EmptyState text="No announcements yet." />
              : announcements.map(card => (
                <OverviewCard key={card.id || card.entityId} card={{ ...card, type: CARD_TYPES.ANNOUNCEMENT }} />
              ))}
          </SectionBlock>
          <SectionBlock
            title="Tournaments"
            action={<Link to="/tournaments" className="link-inline">View all tournaments →</Link>}
          >
            <p>Browse live, upcoming, and past tournaments.</p>
          </SectionBlock>
        </div>

        <div className="col">
          <SectionBlock title="Followed teams">
            {followedCards.length === 0
              ? <EmptyState text="Follow teams in fixtures or standings to see them here." />
              : followedCards.map(card => (
                <OverviewCard
                  key={card.id || card.entityId}
                  card={card}
                  isFollowing={(key) => isFollowing(key)}
                  onFollowToggle={(key) => toggleFollow(key)}
                />
              ))}
          </SectionBlock>

          <SectionBlock title="Upcoming fixtures">
            {fixtureCards.length === 0
              ? <EmptyState text="Fixtures for this season will appear soon." />
              : fixtureCards.map(card => (
                <OverviewCard
                  key={card.id || card.entityId}
                  card={card}
                  isFollowing={(key) => isFollowing(key)}
                  onFollowToggle={(key) => toggleFollow(key)}
                />
              ))}
          </SectionBlock>

          <SectionBlock title="Standings snapshot">
            {standingCards.length === 0
              ? <EmptyState text="Standings feed is loading…" />
              : standingCards.map(card => (
                <OverviewCard key={card.id || card.entityId} card={card} />
              ))}
          </SectionBlock>
        </div>
      </div>

      {loading ? <p className="loading-indicator">Refreshing latest data…</p> : null}

      <div className="feedback-footer">
        <a className="feedback-btn" href="mailto:hello@lbdc.co.za?subject=HJ App Feedback">
        Send Feedback
        </a>
      </div>
    </div>
  );
}

function SectionBlock({ title, children, action }) {
  return (
    <div className="card section-card">
      <div className="section-head">
        <h2>{title}</h2>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="section-body">
        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty card muted">
      {text}
    </div>
  );
}
