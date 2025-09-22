import { useEffect, useMemo, useState } from "react";
import { getFixturesRows } from "../lib/api";
import { useFollows } from "../lib/follows";

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

/* ---- component ---- */
export default function Fixtures({ ageId, ageLabel }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  const { isFollowing, toggleFollow } = useFollows();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getFixturesRows(ageId);
        if (alive) setRows(data);
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [ageId]);

  const dates = useMemo(() => {
    const set = new Set(rows.map(r => (r.Date || "").toString().trim()).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const base = date === "All" ? rows : rows.filter(r => String(r.Date).trim() === date);

    const scoped = onlyFollowing
      ? base.filter(f =>
          isFollowing(`${ageId}:${f.Team1}`) || isFollowing(`${ageId}:${f.Team2}`)
        )
      : base;

    return scoped.slice().sort((a, b) => {
      const da = parseDateLabel(a.Date);
      const db = parseDateLabel(b.Date);
      if (da !== db) return da - db;
      return toMinutes(a.Time) - toMinutes(b.Time);
    });
  }, [rows, date, onlyFollowing, isFollowing, ageId]);

  if (loading) return <div className="p-4">Loading fixtures…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4">
      <div className="toolbar">
        <h2 className="title">{ageLabel} — Fixtures</h2>
        <div className="toolbar-right">
          <label style={{ marginRight: 8 }}>Date</label>
          <select value={date} onChange={e => setDate(e.target.value)}>
            {dates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "8px 0 12px" }}>
        <input
          type="checkbox"
          checked={onlyFollowing}
          onChange={e => setOnlyFollowing(e.target.checked)}
        />
        Show only followed teams
      </label>

      <div className="cards">
        {filtered.map((f, i) => {
          const played = hasScore(f.Score1) || hasScore(f.Score2);
          const star1On = isFollowing(`${ageId}:${f.Team1}`);
          const star2On = isFollowing(`${ageId}:${f.Team2}`);
          const cardFollowed = star1On || star2On;

          return (
            <div
              key={`${f.Date}-${f.Time}-${f.Team1}-${f.Team2}-${i}`}
              className={`fixture-card ${cardFollowed ? "card-following" : ""}`}
            >
              <div className="meta">
                {f.Date} • {f.Venue} • {f.Round}
              </div>

              <div className="match">
                <div className="time">{f.Time}</div>

                <div className="teams">
                  <div className="team-row">
                    <button
                      className="star-btn"
                      onClick={() => toggleFollow(`${ageId}:${f.Team1}`)}
                      aria-label={star1On ? "Unfollow team" : "Follow team"}
                    >
                      <span className={`star ${star1On ? "is-on" : "is-off"}`}>
                        {star1On ? "★" : "☆"}
                      </span>
                    </button>
                    <span className="team-name">{f.Team1}</span>
                  </div>

                  <div className="team-row">
                    <button
                      className="star-btn"
                      onClick={() => toggleFollow(`${ageId}:${f.Team2}`)}
                      aria-label={star2On ? "Unfollow team" : "Follow team"}
                    >
                      <span className={`star ${star2On ? "is-on" : "is-off"}`}>
                        {star2On ? "★" : "☆"}
                      </span>
                    </button>
                    <span className="team-name">{f.Team2}</span>
                  </div>
                </div>

                <div className="score">
                  {played ? `${f.Score1 ?? ""} – ${f.Score2 ?? ""}` : "TBD"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}