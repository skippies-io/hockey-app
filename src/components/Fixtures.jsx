import { useEffect, useMemo, useState } from "react";
import { getFixturesRows } from "../lib/api";

function toMinutes(t) { if (!t) return 0; const [hh, mm] = String(t).split(":").map(Number); return (hh||0)*60 + (mm||0); }
function hasScore(x) { const n = Number(x); return !Number.isNaN(n) && String(x).trim() !== ""; }

export default function Fixtures({ ageId, ageLabel }) {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getFixturesRows(ageId);
        if (alive) setRows(data);
      } catch (e) { setErr(e.message || String(e)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [ageId]);

  const dates = useMemo(() => {
    const set = new Set(rows.map(r => (r.Date || "").toString().trim()).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const list = date === "All" ? rows : rows.filter(r => String(r.Date).trim() === date);
    return list.slice().sort((a,b) => {
      const da = String(a.Date), db = String(b.Date);
      if (da !== db) return da.localeCompare(db);
      return toMinutes(a.Time) - toMinutes(b.Time);
    });
  }, [rows, date]);

  if (loading) return <div className="p-4">Loading fixtures…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

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

      <div className="cards">
        {filtered.map((m, i) => {
          const played = hasScore(m.Score1) || hasScore(m.Score2);
          return (
            <div key={i} className="card">
              <div className="meta">{m.Date} • {m.Venue} • {m.Round}</div>
              <div className="match">
                <div className="time">{m.Time}</div>
                <div className="teams">
                  <div>{m.Team1}</div>
                  <div className="sub">{m.Team2}</div>
                </div>
                <div className="score">{played ? `${m.Score1 ?? ""} - ${m.Score2 ?? ""}` : "TBD"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
