import { useEffect, useMemo, useState, useCallback } from "react";
import { getStandingsRows } from "../lib/api";
import { useFollows } from "../lib/follows";
import { teamInitials, colorFromName } from "../lib/badges";

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
  const [pool, setPool] = useState("All");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const { isFollowing, toggleFollow } = useFollows();
  const [onlyFollowing, setOnlyFollowing] = useState(false);

  // Load standings data for this age
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

  // Build pool list with "All" first
  const pools = useMemo(() => {
    const set = new Set(rows.map(r => String(r.Pool || "").trim()).filter(Boolean));
    const list = Array.from(set).sort();
    return ["All", ...list];
  }, [rows]);

  // Reset selection if current pool disappears
  useEffect(() => {
    if (!pools.includes(pool)) setPool("All");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pools]);

  // Memoized finalize that applies follow filter (scoped by age) and sorts
  const finalize = useCallback((list) => {
    let out = list;
    if (onlyFollowing) {
      out = out.filter(r => isFollowing(`${ageId}:${r.Team}`));
    }
    return out.slice().sort(sortStandings);
  }, [onlyFollowing, isFollowing, ageId]);

  // Build sections for “All” or for a single pool in a uniform shape
  const sections = useMemo(() => {
    const m = new Map();
    if (pool === "All") {
      for (const r of rows) {
        const key = String(r.Pool || "").trim() || "?";
        if (!m.has(key)) m.set(key, []);
        m.get(key).push(r);
      }
    } else {
      for (const r of rows) {
        if (String(r.Pool).trim() === pool) {
          if (!m.has(pool)) m.set(pool, []);
          m.get(pool).push(r);
        }
      }
    }
    return Array.from(m.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, list]) => ({ pool: k, rows: finalize(list) }));
  }, [rows, pool, finalize]);

  if (loading) return <div className="p-4">Loading standings…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;

  const PoolBlock = ({ title, items }) => (
    <section style={{ marginBottom: 16 }}>
      <h3 className="pool-head">Pool {title}</h3>

      {/* Mobile cards */}
      <div className="standings-cards">
        {items.map((r, idx) => {
          const keyFollow = `${ageId}:${r.Team}`;
          const followed = isFollowing(keyFollow);
          const key = `${r.Age}-${r.Pool}-${r.Team}-${idx}`;
          const rank = idx + 1;
          const badgeBg = colorFromName(r.Team);
          const init = teamInitials(r.Team);

          return (
            <div key={key} className={`stand-card ${followed ? "following" : ""}`}>
              <div className="sc-top">
                <div className="sc-team">
                  <div className="badge" style={{ background: badgeBg }} aria-hidden>
                    {init}
                  </div>
                  <div className="sc-name">{r.Team}</div>
                </div>

                <div className="sc-right">
                  <span className="rank-chip">#{rank}</span>
                  <span className="sc-points">{r.Points ?? 0} pts</span>
                  <button
                    className="star-btn"
                    aria-label={followed ? "Unfollow team" : "Follow team"}
                    onClick={() => toggleFollow(keyFollow)}
                    title={followed ? "Unfollow" : "Follow"}
                  >
                    <span className={`star ${followed ? "is-on" : "is-off"}`}>
                      {followed ? "★" : "☆"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="sc-grid">
                <div className="sc-stat"><span className="lbl">GP</span>{r.GP}</div>
                <div className="sc-stat"><span className="lbl">W</span>{r.W}</div>
                <div className="sc-stat"><span className="lbl">D</span>{r.D}</div>
                <div className="sc-stat"><span className="lbl">L</span>{r.L}</div>
                <div className="sc-stat"><span className="lbl">GF</span>{r.GF}</div>
                <div className="sc-stat"><span className="lbl">GA</span>{r.GA}</div>
                <div className="gd-chip" title="Goal difference">
                  GD <strong>{Number(r.GD) >= 0 ? `+${r.GD}` : r.GD}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
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
            {items.map((r, idx) => {
              const keyFollow = `${ageId}:${r.Team}`;
              const followed = isFollowing(keyFollow);
              const key = `${r.Age}-${r.Pool}-${r.Team}-${idx}`;
              return (
                <tr key={key} className={followed ? "row-following" : ""}>
                  <td>
                    <button
                      className="star-btn"
                      aria-label={followed ? "Unfollow team" : "Follow team"}
                      onClick={() => toggleFollow(keyFollow)}
                      title={followed ? "Unfollow" : "Follow"}
                    >
                      <span className={`star ${followed ? "is-on" : "is-off"}`}>
                        {followed ? "★" : "☆"}
                      </span>
                    </button>
                  </td>
                  <td className="left">{r.Team}</td>
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
    </section>
  );

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

      {sections.map(sec => (
        <PoolBlock key={sec.pool} title={sec.pool} items={sec.rows} />
      ))}
    </div>
  );
}