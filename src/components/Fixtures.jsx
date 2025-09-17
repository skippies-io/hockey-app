import { useEffect, useMemo, useState } from "react";
import { getSheet } from "../lib/api";

const SHEET_FIXTURES = "U13B_Fixtures"; // change later per age group

function toMinutes(t) {
  // "8:00" -> 480
  if (!t) return 0;
  const [hh, mm] = String(t).split(":").map(Number);
  return (hh||0)*60 + (mm||0);
}

function hasScore(x) {
  const n = Number(x);
  return !Number.isNaN(n) && String(x).trim() !== "";
}

export default function Fixtures() {
  const [rows, setRows] = useState([]);
  const [date, setDate] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getSheet(SHEET_FIXTURES);
        if (alive) setRows(data);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const dates = useMemo(() => {
    const set = new Set(rows.map(r => (r.Date || "").toString().trim()).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [rows]);

  const filtered = useMemo(() => {
    const list = date === "All" ? rows : rows.filter(r => String(r.Date).trim() === date);
    // sort by date (stable by original order), then time
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
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <h2 style={{ margin:0 }}>U13 Boys — Fixtures</h2>
        <div style={{ marginLeft:"auto" }}>
          <label style={{ marginRight:8 }}>Date</label>
          <select value={date} onChange={e=>setDate(e.target.value)}>
            {dates.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:"grid", gap:8 }}>
        {filtered.map((m, i) => {
          const played = hasScore(m.Score1) || hasScore(m.Score2);
          return (
            <div key={i} style={{ border:"1px solid #eee", borderRadius:8, padding:12 }}>
              <div style={{ fontSize:12, color:"#666", marginBottom:4 }}>
                {m.Date} • {m.Venue} • {m.Round}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:60 }}>{m.Time}</div>
                <div style={{ flex:1 }}>
                  <div>{m.Team1}</div>
                  <div style={{ color:"#666" }}>{m.Team2}</div>
                </div>
                <div style={{ width:72, textAlign:"right", fontWeight:600 }}>
                  {played ? `${m.Score1 ?? ""} - ${m.Score2 ?? ""}` : "TBD"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
