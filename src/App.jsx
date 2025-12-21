import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import Card from "./components/Card";
import Fixtures from "./views/Fixtures";
import InstallPrompt from "./components/InstallPrompt";
import Standings from "./views/Standings";
import { FALLBACK_GROUPS } from "./config";
import { getGroups, getStandingsRows } from "./lib/api";
import { useFollows, makeTeamFollowKey } from "./lib/follows";
import { teamProfilePath } from "./lib/routes";
import { useShowFollowedPreference } from "./lib/preferences";
import AppLayout from "./components/AppLayout";
import Feedback from "./views/Feedback";
import InstallBanner from "./components/InstallBanner";
import TeamProfile from "./views/TeamProfile";
import Welcome from "./views/Welcome";
import { useFilterSlot } from "./components/filterSlotContext";

// Filter out placeholder “teams” like 1st Place, Loser SF1, A1, etc.
function isRealTeamName(name) {
  if (!name) return false;
  const trimmed = String(name).trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();

  // 1st Place / 2nd Place / 3rd Place / 4th Place / 5th Place / 6th Place
  if (/^\d+(st|nd|rd|th)\s+place$/.test(lower)) return false;

  // Winner SF1, Loser SF2, Winner QF1, etc.
  if (lower.startsWith("winner ") || lower.startsWith("loser ")) return false;

  // A1, B2, etc. (cross-pool placeholders)
  if (/^[ab][1-4]$/i.test(lower)) return false;

  return true;
}

function TeamsPage({ ageId, ageLabel, ageGroups = [] }) {
  const [teams, setTeams] = useState([]); // [{ ageId, ageLabel, teams: [{ name, pool }] }]
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const { isFollowing, toggleFollow, size: followCount } = useFollows();
  const [onlyFollowing, setOnlyFollowing] = useShowFollowedPreference("teams");

  const isAllAges = ageId === "all";
  const ageLabelMap = useMemo(() => {
    const m = new Map();
    for (const g of ageGroups || []) {
      m.set(g.id, g.label || g.id);
    }
    return m;
  }, [ageGroups]);
  const ageOrder = useMemo(() => {
    const m = new Map();
    (ageGroups || []).forEach((g, idx) => m.set(g.id, idx));
    return m;
  }, [ageGroups]);

  const deriveAgeId = useCallback(
    (row) => {
      if (row?.__ageId) return String(row.__ageId).trim();
      if (!isAllAges) return ageId;
      const age = String(row?.ageId || row?.Age || row?.age || "").trim();
      return age || "unknown";
    },
    [ageId, isAllAges]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const ageList = isAllAges
          ? (ageGroups || []).filter((g) => g.id && g.id !== "all")
          : [{ id: ageId }];

        const results = await Promise.all(
          ageList.map((g) =>
            getStandingsRows(g.id).catch((e) => ({ __error: e }))
          )
        );

        if (!alive) return;

        const ageBuckets = new Map(); // ageId -> Map(name -> { name, pool })

        for (let idx = 0; idx < results.length; idx++) {
          const res = results[idx];
          const ageKey = ageList[idx]?.id;
          if (res && res.__error) {
            throw res.__error;
          }

          for (const row of res || []) {
            const team = row.Team || row.team || "";
            if (!isRealTeamName(team)) continue;

            const name = team.trim();
            const pool = (row.Pool || row.Group || "").trim() || null;
            const rowAgeId = ageKey || deriveAgeId(row);

            if (!ageBuckets.has(rowAgeId)) {
              ageBuckets.set(rowAgeId, new Map());
            }
            const bucket = ageBuckets.get(rowAgeId);

            if (!bucket.has(name)) {
              bucket.set(name, { name, pool });
            } else if (pool && !bucket.get(name).pool) {
              bucket.get(name).pool = pool;
            }
          }
        }

        const compiled = Array.from(ageBuckets.entries()).map(
          ([id, bucket]) => {
            const entries = Array.from(bucket.values());
            entries.sort((a, b) => a.name.localeCompare(b.name));
            return {
              ageId: id,
              ageLabel: ageLabelMap.get(id) || id || "Unknown age",
              teams: entries,
            };
          }
        );

        compiled.sort((a, b) => {
          const orderA = ageOrder.has(a.ageId) ? ageOrder.get(a.ageId) : 999;
          const orderB = ageOrder.has(b.ageId) ? ageOrder.get(b.ageId) : 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.ageLabel.localeCompare(b.ageLabel);
        });

        setTeams(compiled);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [ageId, ageGroups, ageLabelMap, ageOrder, deriveAgeId, isAllAges]);

  const toggleFavorite = (teamName, teamAgeId) => {
    toggleFollow(makeTeamFollowKey(teamAgeId, teamName));
  };

  const isFav = (teamName, teamAgeId) =>
    isFollowing(makeTeamFollowKey(teamAgeId, teamName));

  const filterTeams = (list, teamAgeId) =>
    onlyFollowing ? list.filter((t) => isFav(t.name, teamAgeId)) : list;

  const displayAgeLabel = isAllAges ? "All ages" : ageLabel;

  const filterBar = (
    <Card className="filters-card filter-slot-card">
      <div className="filter-slot-row">
        <label
          className="hj-checkbox-label filter-toggle"
          style={
            followCount === 0
              ? { color: "var(--hj-color-ink-muted)" }
              : undefined
          }
        >
          <input
            type="checkbox"
            checked={onlyFollowing}
            onChange={(e) => setOnlyFollowing(e.target.checked)}
          />
          Show only followed teams ({followCount || 0})
          {followCount === 0 && (
            <div className="filter-help">
              You haven’t followed any teams yet. Tap the ☆ next to a team to
              follow it.
            </div>
          )}
        </label>
      </div>
    </Card>
  );
  useFilterSlot(filterBar);

  const hasAnyTeams = teams.some((bucket) => (bucket?.teams || []).length > 0);

  if (loading) {
    return (
      <div className="page-stack teams-page">
        <Card>Loading teams…</Card>
      </div>
    );
  }
  if (err) {
    return (
      <div className="page-stack teams-page">
        <Card className="text-red-600">Error: {err}</Card>
      </div>
    );
  }

  if (!teams.length || !hasAnyTeams) {
    return (
      <div className="page-stack teams-page">
        <Card>
          No teams found for this {isAllAges ? "selection" : "age group"}.
        </Card>
      </div>
    );
  }

  if (isAllAges) {
    const filteredBuckets = teams
      .map((bucket) => ({
        ...bucket,
        teams: filterTeams(bucket.teams || [], bucket.ageId),
      }))
      .filter((bucket) => bucket.teams.length > 0);

    const showFollowingEmpty =
      onlyFollowing && hasAnyTeams && filteredBuckets.length === 0;

    return (
      <div className="page-stack teams-page">
        {showFollowingEmpty && (
          <Card>
            ⭐ No followed teams yet. Star a few teams to build your list.
          </Card>
        )}

        {filteredBuckets.map((bucket) => (
          <Card key={bucket.ageId} className="teams-section teams-age-block">
            <h3 className="section-title pool-head teams-age-title">
              Teams — {bucket.ageLabel}
            </h3>
            <div className="teams-list">
              {bucket.teams.map((t) => {
                const fav = isFav(t.name, bucket.ageId);
                return (
                  <article
                    key={`${bucket.ageId}:${t.name}`}
                    className={`team-row ${fav ? "card--followed" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFavorite(t.name, bucket.ageId)}
                      aria-label={
                        fav ? `Unfollow ${t.name}` : `Follow ${t.name}`
                      }
                      className="star-btn"
                    >
                      <span className={`star ${fav ? "is-on" : "is-off"}`}>
                        {fav ? "★" : "☆"}
                      </span>
                    </button>
                    <Link
                      to={teamProfilePath(bucket.ageId, t.name)}
                      className="team-link"
                    >
                      {t.name}
                    </Link>
                  </article>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const singleAgeTeams = filterTeams(teams[0]?.teams || [], ageId);
  const showFollowingEmpty =
    onlyFollowing &&
    (teams[0]?.teams || []).length > 0 &&
    singleAgeTeams.length === 0;

  return (
    <div className="page-stack teams-page">
      {showFollowingEmpty && (
        <Card>
          ⭐ No followed teams yet. Star a few teams to build your list.
        </Card>
      )}

      <Card className="teams-section">
        <div className="teams-list">
          {singleAgeTeams.map((t) => {
            const fav = isFav(t.name, ageId);
            return (
              <article
                key={`${ageId}:${t.name}`}
                className={`team-row ${fav ? "card--followed" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => toggleFavorite(t.name, ageId)}
                  aria-label={fav ? `Unfollow ${t.name}` : `Follow ${t.name}`}
                  className="star-btn"
                >
                  <span className={`star ${fav ? "is-on" : "is-off"}`}>
                    {fav ? "★" : "☆"}
                  </span>
                </button>
                <Link to={teamProfilePath(ageId, t.name)} className="team-link">
                  {t.name}
                </Link>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function AgeLayout({ groups, loading, LayoutComponent = Fragment }) {
  const params = useParams();
  const rawAgeId = params.ageId;
  const navigate = useNavigate();
  const location = useLocation();
  const Layout = LayoutComponent;

  // Normalise weird values like "undefined" / "null" to empty string
  const ageId =
    rawAgeId && rawAgeId !== "undefined" && rawAgeId !== "null" ? rawAgeId : "";

  useEffect(() => {
    if (!ageId && groups.length) {
      navigate(`/${groups[0].id}/fixtures`, { replace: true });
    }
  }, [ageId, groups, navigate]);

  const age = groups.find((g) => g.id === ageId);
  const ageLabel = age?.label || ageId || "";

  const currentTab = useMemo(() => {
    // Expect paths like: /U13/fixtures, /U13/standings, /U13/teams
    const segments = location.pathname.split("/").filter(Boolean);
    // segments[0] = ageId, segments[1] = tab (fixtures|standings|teams)
    const maybeTab = segments[1];

    if (
      maybeTab === "standings" ||
      maybeTab === "teams" ||
      maybeTab === "fixtures"
    ) {
      return maybeTab;
    }
    return "fixtures";
  }, [location.pathname]);

  const onAgeChange = (nextId) => {
    const tab = currentTab || "fixtures";
    navigate(`/${nextId}/${tab}`);
  };

  if (!ageId) {
    const body = loading ? (
      <div className="p-4">Loading age…</div>
    ) : (
      <Navigate to="/" replace />
    );
    return <Layout showNav={false}>{body}</Layout>;
  }

  if (!age && !loading) {
    const fallbackId = groups[0]?.id;
    if (fallbackId) {
      return <Navigate to={`/${fallbackId}/fixtures`} replace />;
    }
    return (
      <Layout showNav={false}>
        <div className="p-4 text-red-600">Unknown age id: {ageId}</div>
      </Layout>
    );
  }

  return (
    <Layout
      ageOptions={groups}
      selectedAge={ageId}
      onAgeChange={onAgeChange}
      currentTab={currentTab}
    >
      <Routes>
        <Route
          path="fixtures"
          element={
            <Fixtures ageId={ageId} ageLabel={ageLabel} ageGroups={groups} />
          }
        />
        <Route
          path="standings"
          element={
            <Standings ageId={ageId} ageLabel={ageLabel} ageGroups={groups} />
          }
        />
        <Route
          path="teams"
          element={
            <TeamsPage ageId={ageId} ageLabel={ageLabel} ageGroups={groups} />
          }
        />
        <Route index element={<Navigate to="fixtures" replace />} />
        <Route path="*" element={<Navigate to="fixtures" replace />} />
      </Routes>
    </Layout>
  );
}

function FeedbackPage({ groups }) {
  const navigate = useNavigate();
  const selectedAge = groups[0]?.id || "";

  const handleAgeChange = (nextId) => {
    if (nextId) navigate(`/${nextId}/fixtures`);
  };

  return (
    <AppLayout
      ageOptions={groups}
      selectedAge={selectedAge}
      onAgeChange={handleAgeChange}
      currentTab="feedback"
      showAgeSelector={false}
      enableFilterSlot={false}
    >
      <Feedback />
    </AppLayout>
  );
}

export default function App() {
  const [groups, setGroups] = useState(FALLBACK_GROUPS);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const groupsWithAll = useMemo(() => {
    const rest = (groups || []).filter((g) => g.id !== "all");
    return [{ id: "all", label: "All" }, ...rest];
  }, [groups]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await getGroups();
        if (!alive) return;
        if (Array.isArray(list) && list.length) {
          setGroups(list);
        }
      } catch (e) {
        // keep fallback groups; surface errors in console only
        console.warn("Failed to load groups", e);
      } finally {
        if (alive) setLoadingGroups(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <InstallBanner />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <InstallPrompt />
              <Welcome groups={groupsWithAll} />
            </>
          }
        />
        <Route
          path="/feedback"
          element={<FeedbackPage groups={groupsWithAll} />}
        />
        <Route path="/:ageId/team/:teamId" element={<TeamProfile />} />
        <Route
          path="/:ageId/*"
          element={
            <AgeLayout
              groups={groupsWithAll}
              loading={loadingGroups}
              LayoutComponent={AppLayout}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
