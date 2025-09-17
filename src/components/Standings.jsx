import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStandingsRows } from "../lib/api";

function sortStandings(a, b) {
  const A = { pts:+a.Points||0, gd:+a.GD||0, gf:+a.GF||0, name:(a.Team||"").toLowerCase() };
  const B = { pts:+b.Points||0, gd:+b.GD||0, gf:+b.GF||0, name:(b.Team||"").toLowerCase() };
  if (B.pts !== A.pts) return B.pts - A.pts;
  if (B.gd !== A.gd) return B.gd - A.gd;
  if (B.gf !== A.gf) return B.gf - A.gf;
  return A.name.localeCompare(B.name);
}

export default function Standings({ ageId, ageLabel }) {
  const [rows, setRows] = useState([]);
  const [pool, setPool] = useState("A");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getStandingsRows(ageId);
        if (alive) setRows(data);
      } catch (e) { setErr(e.message || String(e)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [ageId]);

  const pools = useMemo(() => {
    const set = new Set(rows.map(r => (r.Pool || "").toString().trim()));
    return Array.from(set).filter(Boolean).sort();
  }, [rows]);

  useEffect(() => {
    if (pools.length && !pools.includes(pool)) setPool(pools[0]);
  }, [pools]); // eslint-disable-line

  const filtered = useMemo(
    () => rows.filter(r => String(r.Pool).trim() === pool).sort(sortStandings),
    [rows, pool]
  );

  if (loading) return <div className="p-4">Loading standings…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4">
      <div className="toolbar">
        <h2 className="title">{ageLabel} — Standings</h2>
        <div className="toolbar-right">
          <label style={{ marginRight:8 }}>Pool</label>
          <select value={pool} onChange={e=>setPool(e.target.value)}>
            {pools.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="left">Team</th>
              <th>GP</th><th>W</th><th>D</th><th>L</th>
              <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const top = i < 2 ? " row-top" : "";
              return (
                <tr
                  key={r.Team + i}
                  className={"row" + top}
                  onClick={() => navigate(`/team/${encodeURIComponent(r.Team)}`)}
                  title="View team details"
                >
                  <td className="left strong">{r.Team}</td>
                  <td>{r.GP}</td>
                  <td>{r.W}</td>
                  <td>{r.D}</td>
                  <td>{r.L}</td>
                  <td>{r.GF}</td>
                  <td>{r.GA}</td>
                  <td>{r.GD}</td>
                  <td className="strong">{r.Points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
