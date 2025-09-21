import { useEffect, useMemo, useState } from "react";
import { getFixturesRows } from "../lib/api";
import { useFollows } from "../lib/follows";

function toMinutes(t){ if(!t) return 0; const [hh,mm]=String(t).split(":").map(Number); return (hh||0)*60+(mm||0); }
function hasScore(x){ const n=Number(x); return !Number.isNaN(n) && String(x).trim()!==""; }

export default function Fixtures({ ageId, ageLabel }) {
  const [rows, setRows]   = useState([]);
  const [date, setDate]   = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr]     = useState(null);

  const { isFollowing, toggleFollow } = useFollows();
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try{
        setLoading(true);
        const data = await getFixturesRows(ageId);
        if (alive) setRows(data);
      }catch(e){
        if (alive) setErr(e.message || String(e));
      }finally{
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
    let list = date === "All" ? rows : rows.filter(r => String(r.Date).trim() === date);
    // sort by date then time
    list = list.slice().sort((a,b)=>{
      const da=String(a.Date), db=String(b.Date);
      if (da!==db) return da.localeCompare(db);
      return toMinutes(a.Time) - toMinutes(b.Time);
    });
    if (onlyFollowing){
      list = list.filter(f => isFollowing(f.Team1) || isFollowing(f.Team2));
    }
    return list;
  }, [rows, date, onlyFollowing, isFollowing]);

  if (loading) return <div className="p-4">Loading fixtures…</div>;
  if (err)      return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4">
      <div className="toolbar">
        <h2 className="title">{ageLabel} — Fixtures</h2>
        <div className="toolbar-right">
          <label style={{ marginRight:8 }}>Date</label>
          <select value={date} onChange={e=>setDate(e.target.value)}>
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 16px 8px" }}>
        <input type="checkbox" checked={onlyFollowing} onChange={e=>setOnlyFollowing(e.target.checked)} />
        Show only followed teams
      </label>

      <div className="cards">
        {filtered.map((f, i) => {
          const played = hasScore(f.Score1) || hasScore(f.Score2);
          const cardFollowed = isFollowing(f.Team1) || isFollowing(f.Team2);
          return (
            <div key={i} className={`card fixture-card ${cardFollowed ? "card-following" : ""}`}>
              <div className="meta">{f.Date} • {f.Venue} • {f.Round}</div>
              <div className="match">
                <div className="time">{f.Time}</div>
                <div className="teams">
                  <div className="team-row">
                    <button className="star-btn" onClick={()=>toggleFollow(f.Team1)} title="Follow/Unfollow">
                      <span className={`star ${isFollowing(f.Team1) ? "is-on" : "is-off"}`}>{isFollowing(f.Team1) ? "★" : "☆"}</span>
                    </button>
                    {f.Team1}
                  </div>
                  <div className="team-row" style={{ opacity: .9 }}>
                    <button className="star-btn" onClick={()=>toggleFollow(f.Team2)} title="Follow/Unfollow">
                      <span className={`star ${isFollowing(f.Team2) ? "is-on" : "is-off"}`}>{isFollowing(f.Team2) ? "★" : "☆"}</span>
                    </button>
                    {f.Team2}
                  </div>
                </div>
                <div className="score">{played ? `${f.Score1 ?? ""} – ${f.Score2 ?? ""}` : "TBD"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}