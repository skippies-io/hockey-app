import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import FixtureCard from "../components/FixtureCard";
import { getFixturesRows } from "../lib/api";
import { colorFromName, teamInitials } from "../lib/badges";
import { makeTeamFollowKey, useFollows } from "../lib/follows";
import { teamProfilePath } from "../lib/routes";
import { parseDateToUTCms } from "../lib/date";
import {
  classifyFixtureState,
  computeResultPill,
  FixtureState,
} from "../lib/fixtureState.js";
import { sortRecent, sortUpcoming } from "../lib/fixtureSort.js";

const RECENT_COMPLETED_COUNT = 3;

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
      const tsDate = parseDateToUTCms(f.Date);
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
  const toSafeNum = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const statValues = {
    gp: toSafeNum(stats.played),
    w: toSafeNum(stats.wins),
    d: toSafeNum(stats.draws),
    l: toSafeNum(stats.losses),
    gf: toSafeNum(stats.gf),
    ga: toSafeNum(stats.ga),
    gd: toSafeNum(stats.gd),
    pts: toSafeNum(stats.pts),
  };
  const gdLabel = statValues.gd >= 0 ? `+${statValues.gd}` : `${statValues.gd}`;

  const { liveFixtures, recentFixtures, upcomingFixtures, unknownFixtures } =
    useMemo(() => {
      const live = [];
      const recent = [];
      const upcoming = [];
      const unknown = [];

      for (const fx of teamFixtures) {
        const state = classifyFixtureState({
          status: fx.status,
          homeScore: fx.score1,
          awayScore: fx.score2,
          date: fx.date,
        });

        if (state === FixtureState.LIVE) {
          live.push(fx);
        } else if (state === FixtureState.RECENT) {
          recent.push(fx);
        } else if (state === FixtureState.UPCOMING) {
          upcoming.push(fx);
        } else {
          unknown.push(fx);
        }
      }

      return {
        liveFixtures: live,
        recentFixtures: recent,
        upcomingFixtures: upcoming,
        unknownFixtures: unknown,
      };
    }, [teamFixtures]);

  const sortedRecentFixtures = useMemo(
    () => sortRecent(recentFixtures),
    [recentFixtures]
  );
  const sortedUpcomingFixtures = useMemo(
    () => sortUpcoming(upcomingFixtures),
    [upcomingFixtures]
  );

  const sections = useMemo(() => {
    if (filter === "past") {
      return [{ title: null, items: sortedRecentFixtures }];
    }

    if (filter === "live") {
      return [{ title: null, items: liveFixtures }];
    }

    if (filter === "upcoming") {
      return [{ title: null, items: sortedUpcomingFixtures }];
    }

    return [
      { title: "Live", items: liveFixtures },
      { title: "Recent", items: sortedRecentFixtures },
      { title: "Upcoming", items: sortedUpcomingFixtures },
      { title: "Other", items: unknownFixtures },
    ];
  }, [
    filter,
    liveFixtures,
    sortedRecentFixtures,
    sortedUpcomingFixtures,
    unknownFixtures,
  ]);

  const visibleSections = sections.filter((section) => section.items.length > 0);

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
                <div className="hj-team-hero-top hj-team-hero__stack">
                  <div className="hj-team-hero-main hj-team-hero__header">
                    <div className="hj-team-hero__title">
                      <div className="hj-team-hero__title-row">
                        <div
                          className="badge"
                          aria-hidden
                          style={{ backgroundColor: colorFromName(displayName) }}
                        >
                          {teamInitials(displayName)}
                        </div>
                        <h1 className="team-hero-name hj-team-hero__name">
                          {displayName}
                        </h1>
                      </div>
                      <div className="team-hero-meta-row hj-team-hero__meta">
                        {ageId ? (
                          <span className="team-hero-age hj-team-hero__age">
                            {ageId}
                          </span>
                        ) : null}
                        {poolLabel ? (
                          <span className="team-hero-meta hj-team-hero__pool">
                            {poolLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="star-btn team-hero-star hj-team-hero__star"
                      aria-pressed={isFollowed}
                      aria-label={isFollowed ? "Unfollow team" : "Follow team"}
                      onClick={() => toggleFollow(followKey)}
                    >
                      <span className={`star ${isFollowed ? "is-on" : "is-off"}`}>
                        {isFollowed ? "★" : "☆"}
                      </span>
                    </button>
                  </div>
                  <div className="hj-team-hero-summary hj-team-hero__summary">
                    <div className="hj-team-hero-summary-strip hj-team-hero__stats">
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GP</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.gp}
                        </div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">W</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.w}
                        </div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">D</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.d}
                        </div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">L</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.l}
                        </div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GF</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.gf}
                        </div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GA</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.ga}
                        </div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">GD</div>
                        <div className="hj-team-hero-summary-value">{gdLabel}</div>
                      </div>
                      <div className="hj-team-hero-summary-cell">
                        <div className="hj-team-hero-summary-label">PTS</div>
                        <div className="hj-team-hero-summary-value">
                          {statValues.pts}
                        </div>
                      </div>
                    </div>
                    <div className="hj-team-meta">{`Win ${stats.winPct}`}</div>
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
                    <option value="past">Past</option>
                    <option value="live">Live</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                </div>
              </header>

              {teamFixtures.length === 0 || visibleSections.length === 0 ? (
                <div className="tp-empty">No fixtures for this team yet.</div>
              ) : (
                <div className="cards fixtures-list">
                  {visibleSections.map((section, sectionIdx) => (
                    <div
                      key={`${section.title || "section"}-${sectionIdx}`}
                      className="fixtures-date-group"
                    >
                      {section.title ? (
                        <div className="fixtures-date-head">
                          <div className="fixtures-date-title">{section.title}</div>
                        </div>
                      ) : null}
                      <ul className="cards fixtures-list">
                        {section.items.map((fx, idx) => {
                          const homeScore = hasScore(fx.score1)
                            ? Number(fx.score1)
                            : null;
                          const awayScore = hasScore(fx.score2)
                            ? Number(fx.score2)
                            : null;
                          const profilePath1 = teamProfilePath(fx.ageId, fx.teamA);
                          const profilePath2 = teamProfilePath(fx.ageId, fx.teamB);
                          const followKey1 = makeTeamFollowKey(fx.ageId, fx.teamA);
                          const followKey2 = makeTeamFollowKey(fx.ageId, fx.teamB);
                          const resultPill = computeResultPill({
                            fixture: {
                              homeTeam: fx.teamA,
                              awayTeam: fx.teamB,
                              homeScore: fx.score1,
                              awayScore: fx.score2,
                            },
                            teamKey: displayName,
                          });

                          return (
                            <li key={fx.id || `${fx.date}-${idx}`}>
                              <FixtureCard
                                date={fx.date}
                                time={fx.time || "TBD"}
                                venueName={fx.venueName}
                                pool={fx.poolLabel}
                                round={fx.round}
                                showDate={true}
                                showResultPill
                                resultPill={resultPill}
                                homeTeam={
                                  <Link
                                    to={profilePath1}
                                    className="team-link fixture-team-link"
                                  >
                                    {fx.teamA}
                                  </Link>
                                }
                                awayTeam={
                                  <Link
                                    to={profilePath2}
                                    className="team-link fixture-team-link"
                                  >
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
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
