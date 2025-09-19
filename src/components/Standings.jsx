import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStandingsRows } from "../lib/api";
import { useFollows } from "../lib/follows";

function sortStandings(a, b) {
  const A = { pts: +a.Points || 0, gd: +a.GD || 0, gf: +a.GF || 0, name: (a.Team || "").toLowerCase() };
  const B = { pts: +b.Points || 0, gd: +b.GD || 0, gf: +b.GF || 0, name: (b.Team || "").toLowerCase() };
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

  const { isFollowing, toggleFollow } = useFollows();
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  // Load data for ageId
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getStandingsRows(ageId);
        if (alive) setRows(data);
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [ageId]);

  // Available pools (A/B/C/…)
  const pools = useMemo(() => {
    const set = new Set(rows.map(r => String(r.Pool || "").trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  // Ensure selected pool is valid when data changes
  useEffect(() => {
    if (pools.length && !pools.includes(pool)) setPool(pools[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pools]);

  // Final list to render = by pool → optional only-following → sorted
  const display = useMemo(() => {
    let list = rows.filter(r => String(r.Pool).trim() === pool);
    if (onlyFollowing) list = list.filter(r => isFollowing(r.Team));
    return list.sort(sortStandings);
  }, [rows, pool, onlyFollowing, isFollowing]);

  if (loading) return <div className="p-4">Loading standings…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  return (
    <div className="p-4">
      <div className="toolbar">
        <h2 className="title">{ageLabel} — Standings</h2>
        <div className="toolbar-right">
          <label style={{ marginRight: 8 }}>Pool</label>
          <select value={pool} onChange={e => setPool(e.target.value)}>
            {pools.map(p => <option key={p} value={p}>{p}</option>)}
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
      {onlyFollowing && display.length === 0 && (
        <div className="only-following-note">Follow one or more teams to see them here.</div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }} aria-label="follow column"></th>
              <th className="left">Team</th>
              <th>GP</th><th>W</th><th>D</th><th>L</th>
              <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {display.map((r, idx) => {
              const followed = isFollowing(r.Team);
              const key = `${r.Age}-${r.Pool}-${r.Team}-${idx}`;
              return (
                <tr key={key} className={followed ? "row-following" : ""}>
                  <td>
                    <button
                      className="star-btn"
                      aria-label={followed ? "Unfollow team" : "Follow team"}
                      onClick={() => toggleFollow(r.Team)}
                      title={followed ? "Unfollow" : "Follow"}
                    >
                      <span className={`star ${followed ? "is-on" : "is-off"}`}>
                        {followed ? "★" : "☆"}
                      </span>
                    </button>
                  </td>
                  <td
                    className="left"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/${ageId}/team/${encodeURIComponent(r.Team)}`)}
                    title="Open team page"
                  >
                    {r.Team}
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
    </div>
  );
}