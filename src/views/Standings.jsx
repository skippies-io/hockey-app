import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import PageIntroCard from "../components/PageIntroCard";
import { getStandingsRows } from "../lib/api";
import { useFollows, makeTeamFollowKey } from "../lib/follows";
import { teamInitials, colorFromName } from "../lib/badges";
import { teamProfilePath } from "../lib/routes";
import { useShowFollowedPreference } from "../lib/preferences";
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

function StandingsSection({
  heading,
  poolLabel,
  rows,
  ageId,
  ageLabel,
  isFollowing,
  toggleFollow,
}) {
  if (!rows || !rows.length) return null;

  const scopeAgeLabel = ageLabel || ageId || "";

  return (
    <Card className="standings-age-card">
      {heading ? <h3 className="section-title pool-head">{heading}</h3> : null}
      <section style={{ marginBottom: "var(--hj-space-6)" }}>
        {poolLabel ? <h3 className="section-title pool-head">{poolLabel}</h3> : null}

        {/* Mobile cards */}
        <div className="standings-cards">
          {rows.map((r, idx) => {
            const rowAgeId = ageId || r.__ageId || scopeAgeLabel;
            const keyFollow = makeTeamFollowKey(rowAgeId, r.Team);
            const followed = isFollowing(keyFollow);
            const key = `${r.Age || scopeAgeLabel}-${r.Pool}-${r.Team}-${idx}`;
            const rank = idx + 1;
            const badgeBg = colorFromName(r.Team);
            const init = teamInitials(r.Team);
            const profilePath = teamProfilePath(rowAgeId, r.Team);

            return (
              <div
                key={key}
                className={`stand-card ${followed ? "card--followed" : ""}`}
              >
                <div className="sc-top">
                  <div className="sc-team">
                    <div
                      className="badge"
                      style={{ background: badgeBg }}
                      aria-hidden
                    >
                      {init}
                    </div>
                    <div className="sc-name">
                      <Link to={profilePath} className="team-link">{r.Team}</Link>
                    </div>
                  </div>

                  <div className="sc-right">
                    <span className="rank-chip">#{rank}</span>
                    <span className="sc-points">{r.Points ?? 0} pts</span>
                    <button
                      className="star-btn"
                      aria-label={followed ? "Unfollow team" : "Follow team"}
                      onClick={() => toggleFollow(keyFollow)}
                      title={followed ? "Unfollow" : "Follow"}
                    >
                      <span className={`star ${followed ? "is-on" : "is-off"}`}>
                        {followed ? "★" : "☆"}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="sc-grid">
                  <div className="sc-stat">
                    <span className="lbl">GP</span>
                    {r.GP}
                  </div>
                  <div className="sc-stat">
                    <span className="lbl">W</span>
                    {r.W}
                  </div>
                  <div className="sc-stat">
                    <span className="lbl">D</span>
                    {r.D}
                  </div>
                  <div className="sc-stat">
                    <span className="lbl">L</span>
                    {r.L}
                  </div>
                  <div className="sc-stat">
                    <span className="lbl">GF</span>
                    {r.GF}
                  </div>
                  <div className="sc-stat">
                    <span className="lbl">GA</span>
                    {r.GA}
                  </div>
                  <div className="gd-chip" title="Goal difference">
                    GD{" "}
                    <strong>{Number(r.GD) >= 0 ? `+${r.GD}` : r.GD}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="table-wrap">
          <table className="table">
            <colgroup>
              <col style={{ width: 36 }} />
              <col />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
              <col style={{ width: "6ch" }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 36 }} aria-label="follow column"></th>
                <th className="left">Team</th>
                <th>GP</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const rowAgeId = ageId || r.__ageId || scopeAgeLabel;
                const keyFollow = makeTeamFollowKey(rowAgeId, r.Team);
                const followed = isFollowing(keyFollow);
                const key = `${r.Age || scopeAgeLabel}-${r.Pool}-${r.Team}-${idx}`;
                const profilePath = teamProfilePath(rowAgeId, r.Team);
                return (
                  <tr key={key} className={followed ? "row-following" : ""}>
                    <td>
                      <button
                        className="star-btn"
                        aria-label={followed ? "Unfollow team" : "Follow team"}
                        onClick={() => toggleFollow(keyFollow)}
                        title={followed ? "Unfollow" : "Follow"}
                      >
                        <span className={`star ${followed ? "is-on" : "is-off"}`}>
                          {followed ? "★" : "☆"}
                        </span>
                      </button>
                    </td>
                    <td className="left team-name-cell">
                      <Link to={profilePath} className="team-link">{r.Team}</Link>
                    </td>
                    <td>{r.GP}</td>
                    <td>{r.W}</td>
                    <td>{r.D}</td>
                    <td>{r.L}</td>
                    <td>{r.GF}</td>
                    <td>{r.GA}</td>
                    <td>{r.GD}</td>
                    <td>{r.Points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

    if (isAllAges) {
      const ageBuckets = new Map();
      for (const r of rowsWithAge) {
        const key = r.__ageId;
        if (!ageBuckets.has(key)) ageBuckets.set(key, []);
        ageBuckets.get(key).push(r);
      }

      const grouped = [];
      for (const [bucketAgeId, list] of ageBuckets.entries()) {
        const ageHasPools = list.some((r) => String(r.Pool || "").trim());
        const poolMap = new Map();
        for (const r of list) {
          const rawPool = String(r.Pool || "").trim();
          const key = rawPool || (ageHasPools ? "?" : "ALL");
          if (!poolMap.has(key)) poolMap.set(key, []);
          poolMap.get(key).push(r);
        }

        const ageLabelVal =
          ageLabelMap.get(bucketAgeId) || bucketAgeId || "Unknown age";
        for (const [poolKey, poolRows] of poolMap.entries()) {
          const rowsSorted = finalize(poolRows, bucketAgeId);
          if (!rowsSorted.length) continue;
          grouped.push({
            key: `${bucketAgeId}-${poolKey || "ALL"}`,
            ageId: bucketAgeId,
            ageLabel: ageLabelVal,
            heading: `${ageLabelVal} — Standings`,
            poolLabel: poolLabelFromKey(poolKey),
            rows: rowsSorted,
            poolKey,
          });
        }
      }

      return grouped.sort((a, b) => {
        const orderA = ageOrder.has(a.ageId) ? ageOrder.get(a.ageId) : 999;
        const orderB = ageOrder.has(b.ageId) ? ageOrder.get(b.ageId) : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.poolLabel.localeCompare(b.poolLabel);
      });
    }

    const selectedPool =
      showPoolFilter && pool !== "All" ? String(pool || "").trim() : null;
    const hasPools = rowsWithAge.some((r) => String(r.Pool || "").trim());
    const poolMap = new Map();
    for (const r of rowsWithAge) {
      const rawPool = String(r.Pool || "").trim();
      if (selectedPool && rawPool !== selectedPool) continue;
      const key = rawPool || (hasPools ? "?" : "ALL");
      if (!poolMap.has(key)) poolMap.set(key, []);
      poolMap.get(key).push(r);
    }

    if (!poolMap.size && selectedPool) return [];
    if (!poolMap.size) poolMap.set("ALL", rowsWithAge);

    return Array.from(poolMap.entries())
      .map(([poolKey, poolRows]) => ({
        key: `${scopedAgeId}-${poolKey || "ALL"}`,
        ageId: scopedAgeId,
        ageLabel,
        heading: `${ageLabel} — Standings`,
        poolLabel: poolLabelFromKey(poolKey),
        rows: finalize(poolRows, scopedAgeId),
        poolKey,
      }))
      .filter((sec) => sec.rows.length > 0)
      .sort((a, b) => a.poolKey.localeCompare(b.poolKey));
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
    <Card className="filters-card">
      <div className="hj-filter-row">
        {showPoolFilter && (
          <label className="filter-label">
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
          className="hj-checkbox-label"
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

  if (loading) {
    return (
      <div className="page-stack">
        {intro}
        <Card>Loading standings…</Card>
      </div>
    );
  }
  if (err) {
    return (
      <div className="page-stack">
        {intro}
        <Card className="text-red-600">Error: {err}</Card>
      </div>
    );
  }
  if (!rowsWithAge.length) {
    return (
      <div className="page-stack">
        {intro}
        <Card>No standings available yet for this age group.</Card>
      </div>
    );
  }

  const showFollowingEmpty =
    onlyFollowing && rowsWithAge.length > 0 && sections.length === 0;

  return (
    <div className="page-stack">
      <div className="page-section">
        {intro}
        {filterBar}
      </div>

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
            poolLabel={sec.poolLabel}
            rows={sec.rows}
            ageId={sec.ageId}
            ageLabel={sec.ageLabel}
            isFollowing={isFollowing}
            toggleFollow={toggleFollow}
          />
        ))
      )}
    </div>
  );
}
