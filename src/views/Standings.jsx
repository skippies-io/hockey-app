import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import PageIntroCard from "../components/PageIntroCard";
import StandingsRow from "../components/StandingsRow";
import { useFilterSlot } from "../components/AppLayout";
import { getStandingsRows } from "../lib/api";
import { useFollows, makeTeamFollowKey } from "../lib/follows";
import { teamInitials, colorFromName } from "../lib/badges";
import { teamProfilePath } from "../lib/routes";
import { useShowFollowedPreference } from "../lib/preferences";
import useMediaQuery from "../lib/useMediaQuery";
const poolLabelFromKey = (key) => {
  if (key === "ALL") return "All teams";
  if (key === "?") return "Unassigned pool";
  if (!key) return "";
  return `Pool ${key}`;
};

// Sort helper stays the same
function sortStandings(a, b) {
  const A = {
    pts: +a.Points || 0,
    gd: +a.GD || 0,
    gf: +a.GF || 0,
    name: (a.Team || "").toLowerCase(),
  };
  const B = {
    pts: +b.Points || 0,
    gd: +b.GD || 0,
    gf: +b.GF || 0,
    name: (b.Team || "").toLowerCase(),
  };
  if (B.pts !== A.pts) return B.pts - A.pts;
  if (B.gd !== A.gd) return B.gd - A.gd;
  if (B.gf !== A.gf) return B.gf - A.gf;
  return A.name.localeCompare(B.name);
}

function StandingsTeamCardRow({
  teamName,
  teamLabel,
  rank,
  points,
  played,
  won,
  drawn,
  lost,
  gf,
  ga,
  gd,
  badgeBg,
  profilePath,
  isFollowed,
  onToggleFollow,
}) {
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFollow?.();
  };

  const gdLabel = gd >= 0 ? `GD +${gd}` : `GD ${gd}`;
  const stats = [
    { label: "GP", value: played },
    { label: "W", value: won },
    { label: "D", value: drawn },
    { label: "L", value: lost },
    { label: "GF", value: gf },
    { label: "GA", value: ga },
  ];

  return (
    <Card className={`standings-mobile-card ${isFollowed ? "card--followed" : ""}`}>
      <Link to={profilePath} className="standings-mobile-link">
        <div className="smc-header">
          <div className="smc-left">
            <div className="badge" style={{ backgroundColor: badgeBg }}>
              {teamLabel}
            </div>
            <div className="smc-name" title={teamName}>{teamName}</div>
          </div>
          <div className="smc-right">
            <span className="rank-chip">#{rank}</span>
            <span className="smc-points">{points} pts</span>
            <button
              type="button"
              className="star-btn smc-star"
              aria-label={isFollowed ? "Unfollow team" : "Follow team"}
              aria-pressed={isFollowed}
              onClick={handleToggle}
            >
              <span className={`star ${isFollowed ? "is-on" : "is-off"}`}>
                {isFollowed ? "★" : "☆"}
              </span>
            </button>
          </div>
        </div>

        <div className="smc-footer">
          <div className="smc-stats">
            {stats.map((s) => (
              <div key={s.label} className="smc-stat">
                <div className="lbl">{s.label}</div>
                <div className="smc-val">{s.value}</div>
              </div>
            ))}
          </div>
          <div className={`smc-gd ${gd >= 0 ? "smc-gd--pos" : "smc-gd--neg"}`}>
            {gdLabel}
          </div>
        </div>
      </Link>
    </Card>
  );
}

function StandingsSection({
  ageId,
  ageLabel,
  heading,
  pools = [],
  isFollowing,
  toggleFollow,
  isMobile,
}) {
  if (!pools.length) return null;

  const renderRow = (r, idx, poolKey) => {
    const rowAgeId = ageId || r.__ageId || ageLabel || "";
    const followKey = makeTeamFollowKey(rowAgeId, r.Team);
    const isFollowed = isFollowing(followKey);
    const rank = r.Rank != null ? r.Rank : idx + 1;
    const badgeBg = colorFromName(r.Team);
    const init = teamInitials(r.Team);
    const profilePath = teamProfilePath(rowAgeId, r.Team);

    if (isMobile) {
      return (
        <StandingsTeamCardRow
          key={`${r.Age || rowAgeId}-${poolKey}-${r.Team}-${idx}`}
          teamName={r.Team}
          teamLabel={init}
          rank={rank}
          points={r.Points ?? 0}
          played={r.GP ?? r.P ?? 0}
          won={r.W ?? 0}
          drawn={r.D ?? 0}
          lost={r.L ?? 0}
          gf={r.GF ?? 0}
          ga={r.GA ?? 0}
          gd={r.GD ?? 0}
          badgeBg={badgeBg}
          profilePath={profilePath}
          isFollowed={isFollowed}
          onToggleFollow={() => toggleFollow(followKey)}
        />
      );
    }

    return (
      <StandingsRow
        key={`${r.Age || rowAgeId}-${poolKey}-${r.Team}-${idx}`}
        rank={rank}
        teamName={
          <Link to={profilePath} className="team-link fixture-team-link">
            {r.Team}
          </Link>
        }
        badgeColor={badgeBg}
        initials={init}
        played={r.GP ?? r.P ?? 0}
        won={r.W ?? 0}
        drawn={r.D ?? 0}
        lost={r.L ?? 0}
        gf={r.GF ?? 0}
        ga={r.GA ?? 0}
        gd={r.GD ?? 0}
        points={r.Points ?? 0}
        isFollowed={isFollowed}
        onToggleFollow={() => toggleFollow(followKey)}
      />
    );
  };

  if (isMobile) {
    return (
      <div className="standings-mobile-section">
        {heading ? <h3 className="section-title pool-head">{heading}</h3> : null}
        {pools.map((pool) => (
          <section key={pool.poolKey || pool.poolLabel} className="standings-mobile-pool">
            {pool.poolLabel ? (
              <div className="stand-mobile-pool-head">
                <span className="stand-pool-label">{pool.poolLabel}</span>
                <span className="stand-mobile-pool-count">{pool.rows.length} teams</span>
              </div>
            ) : null}
            <div className="standings-mobile-list">
              {pool.rows.map((r, idx) => renderRow(r, idx, pool.poolKey))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <Card className="standings-age-card">
      {heading ? <h3 className="section-title pool-head">{heading}</h3> : null}
      <section style={{ marginBottom: "var(--hj-space-6)" }}>
        <div className="stand-card">
          {pools.map((pool) => (
            <div key={pool.poolKey || pool.poolLabel} className="stand-pool-block">
              {pool.poolLabel ? (
                <div className="stand-card-header">
                  <span className="stand-pool-label">{pool.poolLabel}</span>
                  <div className="stand-header-stats" aria-hidden="true">
                    <span className="lbl">P</span>
                    <span className="lbl">W</span>
                    <span className="lbl">D</span>
                    <span className="lbl">L</span>
                    <span className="lbl">GF</span>
                    <span className="lbl">GA</span>
                    <span className="lbl">GD</span>
                    <span className="lbl lbl--points">Pts</span>
                  </div>
                </div>
              ) : null}
              <div className="stand-card-body">
                {pool.rows.map((r, idx) => renderRow(r, idx, pool.poolKey))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}

/**
 * Props:
 * - ageId
 * - ageLabel
 * - format: "POOL_STAGES" | "ROUND_ROBIN" | "DOUBLE_ROUND_ROBIN" | "UNKNOWN"
 * - poolsMeta: string[] like ["A", "B"]
 */
export default function Standings({
  ageId,
  ageLabel,
  format = "UNKNOWN",
  poolsMeta = [],
  ageGroups = [],
}) {
  const [rows, setRows] = useState([]);
  const [pool, setPool] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const { isFollowing, toggleFollow, size: followCount } = useFollows();
  const [onlyFollowing, setOnlyFollowing] = useShowFollowedPreference("standings");

  const { ageId: routeAgeId } = useParams();
  const scopedAgeId = routeAgeId || ageId;

  const isAllAges = scopedAgeId === "all";
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
      if (!isAllAges) return scopedAgeId;
      const age = String(row?.ageId || row?.Age || row?.age || "").trim();
      return age || "unknown";
    },
    [scopedAgeId, isAllAges]
  );

  // Load standings data for this age
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        if (isAllAges) {
          const ageList = (ageGroups || []).filter((g) => g.id && g.id !== "all");
          const results = await Promise.all(
            ageList.map((g) => getStandingsRows(g.id).catch((e) => ({ __error: e })))
          );
          if (!alive) return;

          const merged = [];
          for (let i = 0; i < results.length; i++) {
            const res = results[i];
            const ageKey = ageList[i]?.id;
            if (res && res.__error) {
              throw res.__error;
            }
            for (const r of res || []) {
              const rAge = ageKey || deriveAgeId(r);
              merged.push({ ...r, __ageId: rAge });
            }
          }
          setRows(merged);
        } else {
          const data = await getStandingsRows(scopedAgeId);
          if (alive) setRows(data || []);
        }
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scopedAgeId, isAllAges, ageGroups, deriveAgeId]);

  // Derive pools from the actual rows (fallback when BE meta is missing)
  const derivedPoolsFromRows = useMemo(() => {
    const set = new Set(
      rows
        .map((r) => String(r.Pool || "").trim())
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [rows]);

  // Decide which pool list to use: BE metadata or derived from rows
  const activePools = useMemo(() => {
    const base =
      Array.isArray(poolsMeta) && poolsMeta.length
        ? poolsMeta
        : derivedPoolsFromRows;

    const unique = Array.from(
      new Set((base || []).map((p) => String(p || "").trim()).filter(Boolean))
    );
    unique.sort();
    return unique;
  }, [poolsMeta, derivedPoolsFromRows]);

  // Show pool filter only for POOL_STAGES and when >1 pool (and not on "All")
  const showPoolFilter =
    !isAllAges && format === "POOL_STAGES" && activePools && activePools.length > 1;

  // Options for dropdown (when visible)
  const poolOptions = useMemo(() => {
    if (!showPoolFilter) return ["All"];
    return ["All", ...activePools];
  }, [showPoolFilter, activePools]);

  // Reset selection if current pool disappears or filter is hidden
  useEffect(() => {
    if (!showPoolFilter || !poolOptions.includes(pool)) {
      setPool("All");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPoolFilter, poolOptions.join("|")]);

  const rowsWithAge = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        __ageId: r.__ageId || deriveAgeId(r),
      })),
    [rows, deriveAgeId]
  );

  // Memoized finalize that applies follow filter (scoped by age) and sorts
  const finalize = useCallback(
    (list, scopeAgeId) => {
      let out = list || [];
      if (onlyFollowing) {
        out = out.filter((r) => {
          const rowAgeId = scopeAgeId || r.__ageId || deriveAgeId(r);
          const key = makeTeamFollowKey(rowAgeId, r.Team);
          return isFollowing(key);
        });
      }
      return out.slice().sort(sortStandings);
    },
    [onlyFollowing, isFollowing, deriveAgeId]
  );

  const sections = useMemo(() => {
    if (!rowsWithAge.length) return [];

    const buildPoolsForAge = (list, ageKey) => {
      const ageHasPools = list.some((r) => String(r.Pool || "").trim());
      const poolMap = new Map();
      for (const r of list) {
        const rawPool = String(r.Pool || "").trim();
        const key = rawPool || (ageHasPools ? "?" : "ALL");
        if (!poolMap.has(key)) poolMap.set(key, []);
        poolMap.get(key).push(r);
      }

      return Array.from(poolMap.entries())
        .map(([poolKey, poolRows]) => {
          const rowsSorted = finalize(poolRows, ageKey);
          return {
            poolKey,
            poolLabel: poolLabelFromKey(poolKey),
            rows: rowsSorted,
          };
        })
        .filter((p) => p.rows.length > 0)
        .sort((a, b) => a.poolKey.localeCompare(b.poolKey));
    };

    if (isAllAges) {
      const ageBuckets = new Map();
      for (const r of rowsWithAge) {
        const key = r.__ageId;
        if (!ageBuckets.has(key)) ageBuckets.set(key, []);
        ageBuckets.get(key).push(r);
      }

      return Array.from(ageBuckets.entries())
        .map(([bucketAgeId, list]) => {
          const ageLabelVal =
            ageLabelMap.get(bucketAgeId) || bucketAgeId || "Unknown age";
          return {
            key: bucketAgeId,
            ageId: bucketAgeId,
            ageLabel: ageLabelVal,
            heading: `${ageLabelVal} — Standings`,
            pools: buildPoolsForAge(list, bucketAgeId),
          };
        })
        .sort((a, b) => {
          const orderA = ageOrder.has(a.ageId) ? ageOrder.get(a.ageId) : 999;
          const orderB = ageOrder.has(b.ageId) ? ageOrder.get(b.ageId) : 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.ageLabel.localeCompare(b.ageLabel);
        });
    }

    const selectedPool =
      showPoolFilter && pool !== "All" ? String(pool || "").trim() : null;
    const poolFiltered = selectedPool
      ? rowsWithAge.filter((r) => String(r.Pool || "").trim() === selectedPool)
      : rowsWithAge;
    const pools = buildPoolsForAge(
      poolFiltered.length ? poolFiltered : rowsWithAge,
      scopedAgeId
    );

    if (!pools.length) return [];

    return [
      {
        key: scopedAgeId,
        ageId: scopedAgeId,
        ageLabel,
        heading: `${ageLabel} — Standings`,
        pools,
      },
    ];
  }, [
    rowsWithAge,
    isAllAges,
    finalize,
    scopedAgeId,
    ageLabel,
    showPoolFilter,
    pool,
    ageOrder,
    ageLabelMap,
  ]);

  const displayAgeLabel = isAllAges ? "All ages" : ageLabel;
  const isMobile = useMediaQuery("(max-width: 640px)");

  const intro = (
    <PageIntroCard
      eyebrow="Standings"
      title={`${displayAgeLabel} — Standings`}
      description={
        format === "POOL_STAGES"
          ? "Standings by pool. Track ranks, points, and followed teams."
          : "Overall standings. Track ranks, points, and followed teams."
      }
    />
  );

  const filterBar = (
    <Card className="filters-card filter-slot-card">
      <div className="filter-slot-row">
        {showPoolFilter && (
          <label className="filter-label filter-label--compact">
            Pool
            <select
              value={pool}
              onChange={(e) => setPool(e.target.value)}
            >
              {poolOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
        <label
          className="hj-checkbox-label filter-toggle"
          style={followCount === 0 ? { color: "var(--hj-color-ink-muted)" } : undefined}
        >
          <input
            type="checkbox"
            checked={onlyFollowing}
            onChange={(e) => setOnlyFollowing(e.target.checked)}
          />
          Show only followed teams ({followCount || 0})
          {followCount === 0 && (
            <div className="filter-help">
              You haven’t followed any teams yet. Tap the ☆ next to a team to follow it.
            </div>
          )}
        </label>
      </div>
    </Card>
  );
  useFilterSlot(filterBar);

  if (loading) {
    return (
      <div className="page-stack standings-page">
        <Card>Loading standings…</Card>
        <div className="page-section page-section--subtle">{intro}</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="page-stack standings-page">
        <Card className="text-red-600">Error: {err}</Card>
        <div className="page-section page-section--subtle">{intro}</div>
      </div>
    );
  }
  if (!rowsWithAge.length) {
    return (
      <div className="page-stack standings-page">
        <Card>No standings available yet for this age group.</Card>
        <div className="page-section page-section--subtle">{intro}</div>
      </div>
    );
  }

  const showFollowingEmpty =
    onlyFollowing && rowsWithAge.length > 0 && sections.length === 0;

  return (
    <div className="page-stack standings-page">
      {!sections.length ? (
        <Card>
          {showFollowingEmpty
            ? "📊 No standings for your followed teams yet."
            : `No standings available yet for this ${isAllAges ? "selection" : "age group"}.`}
        </Card>
      ) : (
        sections.map((sec) => (
          <StandingsSection
            key={sec.key}
            heading={sec.heading}
            ageId={sec.ageId}
            ageLabel={sec.ageLabel}
            pools={sec.pools}
            isFollowing={isFollowing}
            toggleFollow={toggleFollow}
            isMobile={isMobile}
          />
        ))
      )}

      <div className="page-section page-section--subtle">{intro}</div>
    </div>
  );
}
