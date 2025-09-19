import { useEffect, useMemo, useState } from "react";
import { getFixturesRows } from "../lib/api";
import { useFollows } from "../lib/follows";

function toMinutes(t) {
  if (!t) return 0;
  const [hh, mm] = String(t).split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
}
function hasScore(x) {
  const n = Number(x);
  return !Number.isNaN(n) && String(x).trim() !== "";
}

export default function Fixtures({ ageId, ageLabel }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // follow helpers
  const { isFollowing, toggleFollow } = useFollows();
  const [onlyFollowing, setOnlyFollowing] = useState(false);

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
    return () => {
      alive = false;
    };
  }, [ageId]);

  const dates = useMemo(() => {
    const set = new Set(
      rows.map(r => (r.Date || "").toString().trim()).filter(Boolean)
    );
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const list =
      date === "All" ? rows : rows.filter(r => String(r.Date).trim() === date);
    return list.slice().sort((a, b) => {
      const da = String(a.Date),
        db = String(b.Date);
      if (da !== db) return da.localeCompare(db);
      return toMinutes(a.Time) - toMinutes(b.Time);
    });
  }, [rows, date]);

  if (loading) return <div className="p-4">Loading fixtures…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4">
      <div className="toolbar" style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <h2 className="title" style={{ margin: 0 }}>{ageLabel} — Fixtures</h2>
        <div className="toolbar-right" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label>Date</label>
          <select value={date} onChange={e => setDate(e.target.value)}>
            {dates.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={onlyFollowing}
          onChange={e => setOnlyFollowing(e.target.checked)}
        />
        Show only followed teams
      </label>

      <div className="cards" style={{ display: "grid", gap: 10 }}>
        {filtered.map((m, i) => {
          const played = hasScore(m.Score1) || hasScore(m.Score2);
          const cardFollowed = isFollowing(m.Team1) || isFollowing(m.Team2);
          if (onlyFollowing && !cardFollowed) return null;

          return (
            <div
              key={`${m.Date}-${m.Time}-${m.Team1}-${m.Team2}-${i}`}
              className={`fixture-card ${cardFollowed ? "card-following" : ""}`}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                background: "#fff"
              }}
            >
              <div className="meta" style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                {m.Date} • {m.Venue} • {m.Round}
              </div>

              <div className="match" style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", alignItems: "center", gap: 10 }}>
                <div className="fixture-time" style={{ fontWeight: 600 }}>{m.Time}</div>

                <div className="fixture-body" style={{ display: "grid", gap: 6 }}>
                  <div className="team-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="star-btn" onClick={() => toggleFollow(m.Team1)} title={isFollowing(m.Team1) ? "Unfollow" : "Follow"}>
                      <span className={`star ${isFollowing(m.Team1) ? "is-on" : "is-off"}`}>
                        {isFollowing(m.Team1) ? "★" : "☆"}
                      </span>
                    </button>
                    <span className="team-name">{m.Team1}</span>
                  </div>

                  <div className="team-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="star-btn" onClick={() => toggleFollow(m.Team2)} title={isFollowing(m.Team2) ? "Unfollow" : "Follow"}>
                      <span className={`star ${isFollowing(m.Team2) ? "is-on" : "is-off"}`}>
                        {isFollowing(m.Team2) ? "★" : "☆"}
                      </span>
                    </button>
                    <span className="team-name">{m.Team2}</span>
                  </div>
                </div>

                <div className="score" style={{ fontWeight: 700 }}>
                  {played ? `${m.Score1 ?? ""}–${m.Score2 ?? ""}` : "TBD"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}