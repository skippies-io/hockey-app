import { useEffect, useMemo, useState } from "react";
import { getSheet } from "../lib/api";

const SHEET_STANDINGS = "U13B_Standings"; // change later per age group

function sortStandings(a, b) {
  // Points desc, GD desc, GF desc, Team asc
  const key = (x) => ({
    pts: Number(x.Points) || 0,
    gd: Number(x.GD) || 0,
    gf: Number(x.GF) || 0,
    name: (x.Team || "").toLowerCase(),
  });
  const A = key(a), B = key(b);
  if (B.pts !== A.pts) return B.pts - A.pts;
  if (B.gd !== A.gd) return B.gd - A.gd;
  if (B.gf !== A.gf) return B.gf - A.gf;
  return A.name.localeCompare(B.name);
}

export default function Standings() {
  const [rows, setRows] = useState([]);
  const [pool, setPool] = useState("A");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getSheet(SHEET_STANDINGS);
        if (alive) setRows(data);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pools = useMemo(() => {
    const set = new Set(rows.map(r => (r.Pool || "").toString().trim()));
    return Array.from(set).filter(Boolean).sort();
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter(r => String(r.Pool).trim() === pool).sort(sortStandings),
    [rows, pool]
  );

  if (loading) return <div className="p-4">Loading standings…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4">
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <h2 style={{ margin:0 }}>U13 Boys — Standings</h2>
        <div style={{ marginLeft:"auto" }}>
          <label style={{ marginRight:8 }}>Pool</label>
          <select value={pool} onChange={e=>setPool(e.target.value)}>
            {pools.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table width="100%" cellPadding="8" style={{ borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#f3f3f3" }}>
              <th align="left">Team</th>
              <th>GP</th><th>W</th><th>D</th><th>L</th>
              <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.Team + i} style={{ borderTop:"1px solid #eee" }}>
                <td align="left">{r.Team}</td>
                <td align="center">{r.GP}</td>
                <td align="center">{r.W}</td>
                <td align="center">{r.D}</td>
                <td align="center">{r.L}</td>
                <td align="center">{r.GF}</td>
                <td align="center">{r.GA}</td>
                <td align="center">{r.GD}</td>
                <td align="center"><b>{r.Points}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
