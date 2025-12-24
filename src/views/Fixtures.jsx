import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import FixtureCard from "../components/FixtureCard";
import { useFilterSlot } from "../components/filterSlotContext";
import FilterBar from "../components/FilterBar";
import { getFixturesRows } from "../lib/api";
import { useFollows, makeTeamFollowKey } from "../lib/follows";
import { useShowFollowedPreference } from "../lib/preferences";
import { teamProfilePath } from "../lib/routes";
import { formatFixtureDate, parseDateToUTCms } from "../lib/date";

/* ---- helpers ---- */
function formatDateLabelDisplay(label) {
  return formatFixtureDate(label);
}

function parseDateLabel(s) {
  return parseDateToUTCms(s);
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

function formatPoolLabel(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  return v.toLowerCase().startsWith("pool") ? v : `Pool ${v}`;
}

function normalizeVenueName(v) {
  return String(v || "").trim();
}

function normalizeStatus(row, played) {
  const s = typeof row?.Status === "string" ? row.Status.trim() : "";
  if (s) return s.toLowerCase();
  return played ? "final" : "upcoming";
}

function groupByDate(items) {
  // items already sorted by date/time; we preserve order.
  const out = [];
  const idx = new Map(); // dateStr -> index in out

  for (const r of items) {
    const d = String(r?.Date || "").trim() || "Unknown date";
    if (!idx.has(d)) {
      idx.set(d, out.length);
      out.push({ date: d, items: [] });
    }
    out[idx.get(d)].items.push(r);
  }

  return out;
}

function buildAgeLabelMap(ageGroups) {
  const m = new Map();
  for (const g of ageGroups || []) {
    m.set(g.id, g.label || g.id);
  }
  return m;
}

function buildAgeOrderMap(ageGroups) {
  const m = new Map();
  (ageGroups || []).forEach((g, idx) => m.set(g.id, idx));
  return m;
}

function sortByDateTime(a, b) {
  const da = parseDateLabel(a?.Date);
  const db = parseDateLabel(b?.Date);
  if (da !== db) return da - db;
  return toMinutes(a?.Time) - toMinutes(b?.Time);
}

async function fetchAllAgesFixtures({ ageGroups, deriveAgeId }) {
  const ageList = (ageGroups || []).filter((g) => g?.id && g?.id !== "all");

  const results = await Promise.all(
    ageList.map((g) => getFixturesRows(g.id).catch((e) => ({ __error: e })))
  );

  const merged = [];
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const ageKey = ageList[i]?.id;

    if (res?.__error) throw res.__error;

    for (const r of res || []) {
      const rAge = ageKey || deriveAgeId(r);
      merged.push({ ...r, __ageId: rAge });
    }
  }

  return merged;
}

function buildDatesDropdown(rows) {
  const set = new Set(
    rows.map((r) => String(r?.Date || "").trim()).filter(Boolean)
  );
  const list = Array.from(set).sort(
    (a, b) => parseDateLabel(a) - parseDateLabel(b)
  );
  return ["All", ...list];
}

export default function Fixtures({ ageId, ageGroups = [] }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [onlyFollowing, setOnlyFollowing] =
    useShowFollowedPreference("fixtures");
  const { isFollowing, toggleFollow, size: followCount } = useFollows();

  const { ageId: routeAgeId } = useParams();
  const scopedAgeId = routeAgeId || ageId;
  const isAllAges = scopedAgeId === "all";

  const ageLabelMap = useMemo(() => buildAgeLabelMap(ageGroups), [ageGroups]);
  const ageOrder = useMemo(() => buildAgeOrderMap(ageGroups), [ageGroups]);

  const deriveAgeId = useCallback(
    (row) => {
      const explicit = String(row?.__ageId || "").trim();
      if (explicit) return explicit;

      if (!isAllAges) return scopedAgeId;

      const fromRow = String(row?.ageId || row?.Age || row?.age || "").trim();
      return fromRow || "unknown";
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
        setErr(null);

        if (isAllAges) {
          const merged = await fetchAllAgesFixtures({ ageGroups, deriveAgeId });
          if (!alive) return;
          setRows(merged);
          return;
        }

        const data = await getFixturesRows(scopedAgeId);
        if (!alive) return;
        setRows(data);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [scopedAgeId, isAllAges, ageGroups, deriveAgeId]);

  const dates = useMemo(() => buildDatesDropdown(rows), [rows]);

  const filtered = useMemo(() => {
    const byDate =
      date === "All"
        ? rows
        : rows.filter((r) => String(r?.Date || "").trim() === date);

    const byFollow = onlyFollowing
      ? byDate.filter((f) => {
          const rowAgeId = deriveAgeId(f);
          const key1 = makeTeamFollowKey(rowAgeId, f?.Team1);
          const key2 = makeTeamFollowKey(rowAgeId, f?.Team2);
          return isFollowing(key1) || isFollowing(key2);
        })
      : byDate;

    return byFollow
      .slice()
      .sort(sortByDateTime)
      .map((r) => ({ ...r, __ageId: r?.__ageId || deriveAgeId(r) }));
  }, [rows, date, onlyFollowing, isFollowing, deriveAgeId]);

  const groupedByAge = useMemo(() => {
    if (!isAllAges) return [];

    const m = new Map();
    for (const r of filtered) {
      const aId = r?.__ageId;
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

  const dateSelector = (
    <label className="filter-label filter-label--compact">
      <span>Date</span>
      <select value={date} onChange={(e) => setDate(e.target.value)}>
        {dates.map((d) => (
          <option key={d} value={d}>
            {d === "All" ? "All" : formatDateLabelDisplay(d)}
          </option>
        ))}
      </select>
    </label>
  );

  const filterBar = (
    <FilterBar
      rightSlot={dateSelector}
      showFavourites={onlyFollowing}
      onToggleFavourites={setOnlyFollowing}
      favouritesCount={followCount}
    />
  );

  useFilterSlot(filterBar);

  const showFollowingEmpty =
    onlyFollowing && rows.length > 0 && filtered.length === 0;
  const noResults = filtered.length === 0;

  const renderCard = (f, idx, rowAgeId) => {
    const followAgeId = rowAgeId || f?.__ageId || deriveAgeId(f);

    const followId1 = makeTeamFollowKey(followAgeId, f?.Team1);
    const followId2 = makeTeamFollowKey(followAgeId, f?.Team2);

    const star1On = isFollowing(followId1);
    const star2On = isFollowing(followId2);

    const profilePath1 = teamProfilePath(followAgeId, f?.Team1);
    const profilePath2 = teamProfilePath(followAgeId, f?.Team2);

    const played = hasScore(f?.Score1) || hasScore(f?.Score2);
    const homeScore = hasScore(f?.Score1) ? Number(f.Score1) : null;
    const awayScore = hasScore(f?.Score2) ? Number(f.Score2) : null;

    const poolLabel = formatPoolLabel(f?.Pool || f?.Group);
    const venueName = normalizeVenueName(f?.Venue);
    const status = normalizeStatus(f, played);

    return (
      <FixtureCard
        key={`${f?.Date}-${f?.Time}-${f?.Team1}-${f?.Team2}-${idx}-${followAgeId}`}
        date={f?.Date}
        time={f?.Time}
        venueName={venueName}
        pool={poolLabel}
        round={f?.Round}
        showDate={false}
        showPool={isAllAges}
        homeTeam={
          <Link to={profilePath1} className="team-link fixture-team-link">
            {f?.Team1}
          </Link>
        }
        awayTeam={
          <Link to={profilePath2} className="team-link fixture-team-link">
            {f?.Team2}
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

  const renderDateGroups = (items, ageKey) => {
    const groups = groupByDate(items);
    return groups.map((g) => (
      <div key={`${ageKey || "age"}-${g.date}`} className="fixtures-date-group">
        <div className="fixtures-date-head">
          <div className="fixtures-date-title">
            {formatDateLabelDisplay(g.date)}
          </div>
          <div className="fixtures-date-count">{g.items.length}</div>
        </div>
        <div className="cards">
          {g.items.map((f, i) => renderCard(f, i, ageKey))}
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="page-stack fixtures-page">
        <Card>Loading fixtures…</Card>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page-stack fixtures-page">
        <Card className="text-red-600">Error: {err}</Card>
      </div>
    );
  }

  if (showFollowingEmpty) {
    return (
      <div className="page-stack fixtures-page">
        <Card>
          ⏱ No fixtures for your followed teams. Check back later or turn off
          the filter.
        </Card>
      </div>
    );
  }

  if (noResults) {
    return (
      <div className="page-stack fixtures-page">
        <Card>
          <div className="fixtures-empty-title">No fixtures found</div>
          <div className="fixtures-empty-hint">
            Try changing the date or age filter.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack fixtures-page">
      {isAllAges ? (
        groupedByAge.map((group) => (
          <section key={group.ageId} className="page-section">
            <h3 className="section-title pool-head">
              {group.ageLabel} — Fixtures
            </h3>
            {renderDateGroups(group.items, group.ageId)}
          </section>
        ))
      ) : (
        <section className="page-section">
          {renderDateGroups(filtered, scopedAgeId)}
        </section>
      )}
    </div>
  );
}

Fixtures.propTypes = {
  ageId: PropTypes.string,
  ageGroups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string,
    })
  ),
};
