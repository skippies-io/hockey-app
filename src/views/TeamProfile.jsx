import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import FixtureCard from "../components/FixtureCard";
import { getFixturesRows } from "../lib/api";
import { colorFromName, teamInitials } from "../lib/badges";
import { makeTeamFollowKey, useFollows } from "../lib/follows";
import { teamProfilePath } from "../lib/routes";

const MONTH = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function parseDateLabel(s) {
  const m = String(s || "")
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return NaN;
  const day = +m[1];
  const mon = MONTH[m[2].toLowerCase()];
  const year = +m[3];
  if (mon == null || !year || !day) return NaN;
  return Date.UTC(year, mon, day);
}

function toMinutes(t) {
  if (!t) return 0;
  const [hh, mm] = String(t).split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

function hasScore(x) {
  const n = Number(x);
  return !Number.isNaN(n) && String(x).trim() !== "";
}

function normalise(name) {
  return String(name || "").trim().toLowerCase();
}

const joinMeta = (...parts) =>
  parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(" • ");

export default function TeamProfile() {
  const { ageId: rawAgeId, teamId: rawTeamId } = useParams();
  const ageId = decodeURIComponent(rawAgeId || "").trim();
  const teamId = decodeURIComponent(rawTeamId || "").trim();
  const normTarget = normalise(teamId);

  const [loadingData, setLoadingData] = useState(true);
  const [err, setErr] = useState("");
  const [fixtures, setFixtures] = useState([]);
  const [filter, setFilter] = useState("all");

  // Load fixtures for this age group
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoadingData(true);
        setFixtures([]);
        if (!ageId) return;
        const list = await getFixturesRows(ageId);
        if (alive) setFixtures(list || []);
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoadingData(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [ageId]);

  // Derive matches and stats
  const { teamFixtures, stats, displayName, poolLabel } = useMemo(() => {
    const matches = [];
    let nameFromData = teamId;
    let poolFromData = "";

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let played = 0;
    let gf = 0;
    let ga = 0;

    for (const f of fixtures) {
      const t1 = String(f.Team1 || "").trim();
      const t2 = String(f.Team2 || "").trim();
      const nt1 = normalise(t1);
      const nt2 = normalise(t2);

      if (nt1 !== normTarget && nt2 !== normTarget) continue;
      if (nt1 === normTarget) nameFromData = t1 || nameFromData;
      if (nt2 === normTarget) nameFromData = t2 || nameFromData;

      const poolRaw = String(f.Pool || f.Group || "").trim();
      const poolLabel = poolRaw
        ? poolRaw.toLowerCase().startsWith("pool")
          ? poolRaw
          : `Pool ${poolRaw}`
        : "";
      if (!poolFromData && poolRaw) {
        poolFromData = poolRaw.toLowerCase().startsWith("pool") ? poolRaw : `Pool ${poolRaw}`;
      }

      const playedMatch = hasScore(f.Score1) || hasScore(f.Score2);
      const tsDate = parseDateLabel(f.Date);
      const ts = (Number.isNaN(tsDate) ? 0 : tsDate) + toMinutes(f.Time);
      const isHome = nt1 === normTarget;
      const ourScore = isHome ? f.Score1 : f.Score2;
      const oppScore = isHome ? f.Score2 : f.Score1;
      const ourNum = hasScore(ourScore) ? Number(ourScore) : null;
      const oppNum = hasScore(oppScore) ? Number(oppScore) : null;
      let badge = null;
      if (playedMatch && ourNum != null && oppNum != null) {
        if (ourNum > oppNum) badge = "W";
        else if (ourNum === oppNum) badge = "D";
        else badge = "L";
      }

      if (playedMatch) {
        played += 1;
        if (badge === "W") wins += 1;
        else if (badge === "D") draws += 1;
        else if (badge === "L") losses += 1;
        if (ourNum != null) gf += ourNum;
        if (oppNum != null) ga += oppNum;
      }

      const status =
        typeof f.Status === "string" && f.Status.trim()
          ? f.Status.trim().toLowerCase()
          : playedMatch
            ? "final"
            : "upcoming";

      matches.push({
        id: `${ageId}-${t1}-${t2}-${f.Date}-${f.Time}`,
        ageId,
        date: f.Date || "",
        time: f.Time || "",
        teamA: t1,
        teamB: t2,
        venueName: joinMeta(f.Venue, f.Pool || f.Group),
        pool: poolRaw,
        poolLabel,
        round: f.Round || "",
        score1: f.Score1,
        score2: f.Score2,
        badge,
        played: playedMatch,
        ts,
        status,
      });
    }

    const gd = gf - ga;
    const pts = wins * 3 + draws;
    const winPct = played ? `${Math.round((wins / played) * 100)}%` : "—";

    const sorted = matches.slice().sort((a, b) => a.ts - b.ts);

    return {
      teamFixtures: sorted,
      stats: { played, wins, draws, losses, gf, ga, gd, pts, winPct },
      displayName: nameFromData || teamId,
      poolLabel: poolFromData,
    };
  }, [fixtures, normTarget, teamId, ageId]);

  const { isFollowing, toggleFollow } = useFollows();
  const followKey = makeTeamFollowKey(ageId, displayName);
  const isFollowed = isFollowing(followKey);
  const gdLabel = stats.gd >= 0 ? `+${stats.gd}` : `${stats.gd}`;

  const filteredFixtures = useMemo(() => {
    if (filter === "upcoming") return teamFixtures.filter((fx) => !fx.played);
    if (filter === "results") return teamFixtures.filter((fx) => fx.played);
    return teamFixtures;
  }, [filter, teamFixtures]);

  return (
    <AppLayout
      ageOptions={[]}
      selectedAge={ageId}
      currentTab="teams"
      showAgeSelector={false}
      enableFilterSlot={false}
    >
      <div className="page-stack team-profile">
        <div className="page-section">
          <Card className="team-hero">
            {!ageId || !teamId ? (
              <div className="text-red-600">
                {ageId ? "Team not specified." : "Age group not specified."}
              </div>
            ) : err ? (
              <div className="text-red-600">Error: {err}</div>
            ) : loadingData ? (
              <div>Loading team…</div>
            ) : (
              <>
                <div className="hj-team-hero-top">
                  <div className="hj-team-hero-main">
                    <div
                      className="badge"
                      aria-hidden
                      style={{ backgroundColor: colorFromName(displayName) }}
                    >
                      {teamInitials(displayName)}
                    </div>
                    <div className="team-hero-title">
                      <h1 className="team-hero-name">{displayName}</h1>
                      <div className="team-hero-meta">{joinMeta(ageId, poolLabel)}</div>
                    </div>
                    <button
                      type="button"
                      className="star-btn team-hero-star"
                      aria-pressed={isFollowed}
                      aria-label={isFollowed ? "Unfollow team" : "Follow team"}
                      onClick={() => toggleFollow(followKey)}
                    >
                      <span className={`star ${isFollowed ? "is-on" : "is-off"}`}>
                        {isFollowed ? "★" : "☆"}
                      </span>
                    </button>
                  </div>
                  <div className="hj-team-hero-summary">
                    <div className="hj-team-hero-summary-strip">
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">W</div>
                        <div className="hj-team-hero-summary-value">{stats.wins}</div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">D</div>
                        <div className="hj-team-hero-summary-value">{stats.draws}</div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">L</div>
                        <div className="hj-team-hero-summary-value">{stats.losses}</div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GF</div>
                        <div className="hj-team-hero-summary-value">{stats.gf}</div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GA</div>
                        <div className="hj-team-hero-summary-value">{stats.ga}</div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GD</div>
                        <div className="hj-team-hero-summary-value">{gdLabel}</div>
                      </div>
                    </div>
                    <div className="hj-team-meta">
                      {`GP ${stats.played} • ${stats.pts} pts • Win ${stats.winPct}`}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {!loadingData && !err && ageId && teamId && (
          <section className="page-section">
            <Card>
              <header className="hj-section-header fixtures-header">
                <h2 className="hj-section-header-title">Fixtures</h2>
                <div className="fixtures-filter">
                  <label className="fixtures-filter-label" htmlFor="fixtures-filter">
                    <span className="sr-only">Filter fixtures</span>
                  </label>
                  <select
                    id="fixtures-filter"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="results">Results</option>
                  </select>
                </div>
              </header>

              {filteredFixtures.length === 0 ? (
                <div className="tp-empty">No fixtures for this team yet.</div>
              ) : (
                <ul className="cards fixtures-list">
                  {filteredFixtures.map((fx, idx) => {
                    const homeScore = hasScore(fx.score1) ? Number(fx.score1) : null;
                    const awayScore = hasScore(fx.score2) ? Number(fx.score2) : null;
                    const profilePath1 = teamProfilePath(fx.ageId, fx.teamA);
                    const profilePath2 = teamProfilePath(fx.ageId, fx.teamB);
                    const followKey1 = makeTeamFollowKey(fx.ageId, fx.teamA);
                    const followKey2 = makeTeamFollowKey(fx.ageId, fx.teamB);

                    return (
                      <li key={fx.id || `${fx.date}-${idx}`}>
                        <FixtureCard
                          date={fx.date}
                          time={fx.time || "TBD"}
                          venueName={fx.venueName}
                          pool={fx.poolLabel}
                          round={fx.round}
                          homeTeam={
                            <Link to={profilePath1} className="team-link fixture-team-link">
                              {fx.teamA}
                            </Link>
                          }
                          awayTeam={
                            <Link to={profilePath2} className="team-link fixture-team-link">
                              {fx.teamB}
                            </Link>
                          }
                          homeScore={homeScore}
                          awayScore={awayScore}
                          status={fx.status}
                          homeIsFollowed={isFollowing(followKey1)}
                          awayIsFollowed={isFollowing(followKey2)}
                          onToggleHomeFollow={() => toggleFollow(followKey1)}
                          onToggleAwayFollow={() => toggleFollow(followKey2)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
