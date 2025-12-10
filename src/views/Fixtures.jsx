import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import FixtureCard from "../components/FixtureCard";
import PageIntroCard from "../components/PageIntroCard";
import { getFixturesRows } from "../lib/api";
import { useFollows, makeTeamFollowKey } from "../lib/follows";
import { useShowFollowedPreference } from "../lib/preferences";
import { teamProfilePath } from "../lib/routes";

/* ---- helpers ---- */
const MONTH = {
  january:0,february:1,march:2,april:3,may:4,june:5,
  july:6,august:7,september:8,october:9,november:10,december:11
};

function parseDateLabel(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return NaN;
  const day = +m[1];
  const mon = MONTH[m[2].toLowerCase()];
  const year = +m[3];
  if (mon == null || !year || !day) return NaN;
  return Date.UTC(year, mon, day); // UTC to avoid TZ shifts
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

const joinMeta = (...parts) =>
  parts
    .map((p) => (p == null ? "" : String(p).trim()))
    .filter(Boolean)
    .join(" • ");

export default function Fixtures({ ageId, ageLabel, ageGroups = [] }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [onlyFollowing, setOnlyFollowing] = useShowFollowedPreference("fixtures");

  const { isFollowing, toggleFollow, size: followCount } = useFollows();
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
    [isAllAges, scopedAgeId]
  );

  const labelForAge = useCallback(
    (id) => ageLabelMap.get(id) || id || "Unknown age",
    [ageLabelMap]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        if (isAllAges) {
          const ageList = (ageGroups || []).filter((g) => g.id && g.id !== "all");
          const results = await Promise.all(
            ageList.map((g) => getFixturesRows(g.id).catch((e) => ({ __error: e })))
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
          const data = await getFixturesRows(scopedAgeId);
          if (alive) setRows(data);
        }
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [scopedAgeId, isAllAges, ageGroups, deriveAgeId]);

  const dates = useMemo(() => {
    const set = new Set(rows.map(r => (r.Date || "").toString().trim()).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const base = date === "All" ? rows : rows.filter(r => String(r.Date).trim() === date);

    const scoped = onlyFollowing
      ? base.filter((f) => {
          const rowAgeId = deriveAgeId(f);
          const key1 = makeTeamFollowKey(rowAgeId, f.Team1);
          const key2 = makeTeamFollowKey(rowAgeId, f.Team2);
          return isFollowing(key1) || isFollowing(key2);
        })
      : base;

    return scoped.slice().sort((a, b) => {
      const da = parseDateLabel(a.Date);
      const db = parseDateLabel(b.Date);
      if (da !== db) return da - db;
      return toMinutes(a.Time) - toMinutes(b.Time);
    }).map((r) => ({
      ...r,
      __ageId: r.__ageId || deriveAgeId(r),
    }));
  }, [rows, date, onlyFollowing, isFollowing, deriveAgeId]);

  const groupedByAge = useMemo(() => {
    if (!isAllAges) return [];
    const m = new Map();

    for (const r of filtered) {
      const aId = r.__ageId;
      if (!m.has(aId)) m.set(aId, []);
      m.get(aId).push(r);
    }

    return Array.from(m.entries())
      .map(([id, list]) => ({
        ageId: id,
        ageLabel: labelForAge(id),
        items: list,
      }))
      .sort((a, b) => {
        const orderA = ageOrder.has(a.ageId) ? ageOrder.get(a.ageId) : 999;
        const orderB = ageOrder.has(b.ageId) ? ageOrder.get(b.ageId) : 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.ageLabel.localeCompare(b.ageLabel);
      });
  }, [filtered, isAllAges, ageOrder, labelForAge]);

  const displayAgeLabel = isAllAges ? "All ages" : ageLabel;

  const intro = (
    <PageIntroCard
      eyebrow="Fixtures"
      title={`${displayAgeLabel} — Fixtures`}
      description="See match times, pools, and venue allocations. Follow teams to highlight them."
    />
  );

  const filterBar = (
    <Card className="filters-card">
      <div className="hj-filter-row">
        <label className="filter-label">
          Date
          <select value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

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
        <Card>Loading fixtures…</Card>
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

  const renderCard = (f, idx, rowAgeId) => {
    const followAgeId = rowAgeId || f.__ageId || deriveAgeId(f);
    const followId1 = makeTeamFollowKey(followAgeId, f.Team1);
    const followId2 = makeTeamFollowKey(followAgeId, f.Team2);
    const star1On = isFollowing(followId1);
    const star2On = isFollowing(followId2);
    const profilePath1 = teamProfilePath(followAgeId, f.Team1);
    const profilePath2 = teamProfilePath(followAgeId, f.Team2);
    const played = hasScore(f.Score1) || hasScore(f.Score2);
    const homeScore = hasScore(f.Score1) ? Number(f.Score1) : null;
    const awayScore = hasScore(f.Score2) ? Number(f.Score2) : null;
    const venueName = joinMeta(f.Venue, f.Pool || f.Group);
    const status =
      typeof f.Status === "string" && f.Status.trim()
        ? f.Status.trim().toLowerCase()
        : played
          ? "final"
          : "upcoming";

    return (
      <FixtureCard
        key={`${f.Date}-${f.Time}-${f.Team1}-${f.Team2}-${idx}-${followAgeId}`}
        date={f.Date}
        time={f.Time || "TBD"}
        venueLabel="Venue"
        venueName={venueName}
        homeTeam={
          <Link to={profilePath1} className="team-link fixture-team-link">
            {f.Team1}
          </Link>
        }
        awayTeam={
          <Link to={profilePath2} className="team-link fixture-team-link">
            {f.Team2}
          </Link>
        }
        homeScore={homeScore}
        awayScore={awayScore}
        status={status}
        homeIsFollowed={star1On}
        awayIsFollowed={star2On}
        onToggleHomeFollow={() => toggleFollow(followId1)}
        onToggleAwayFollow={() => toggleFollow(followId2)}
      />
    );
  };

  const showFollowingEmpty =
    onlyFollowing && rows.length > 0 && filtered.length === 0;

  return (
    <div className="page-stack">
      <div className="page-section">
        {intro}
        {filterBar}
      </div>

      {showFollowingEmpty ? (
        <Card>⏱ No fixtures for your followed teams. Check back later or turn off the filter.</Card>
      ) : isAllAges ? (
        groupedByAge.map((group) => (
          <section key={group.ageId} className="page-section">
            <h3 className="section-title pool-head">{group.ageLabel} — Fixtures</h3>
            <div className="cards">
              {group.items.map((f, i) => renderCard(f, i, group.ageId))}
            </div>
          </section>
        ))
      ) : (
        <div className="cards">
          {filtered.map((f, i) => renderCard(f, i, scopedAgeId))}
        </div>
      )}
    </div>
  );
}
