import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getStandingsRows, getFixturesRows } from "../lib/api";

function toMinutes(t){ if(!t) return 0; const [hh,mm]=String(t).split(":").map(Number); return (hh||0)*60+(mm||0); }
function hasScore(x){ const n=Number(x); return !Number.isNaN(n) && String(x).trim()!==""; }

export default function Team({ ageId, ageLabel }) {
  const { name } = useParams();
  const teamName = decodeURIComponent(name || "");
  const [stats, setStats] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [standings, games] = await Promise.all([
          getStandingsRows(ageId),
          getFixturesRows(ageId),
        ]);
        if (!alive) return;
        setStats(standings.find(r => (r.Team || "").trim() === teamName.trim()) || null);
        setFixtures(games.filter(g => g.Team1 === teamName || g.Team2 === teamName));
      } catch (e) { setErr(e.message || String(e)); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [teamName, ageId]);

  const played = useMemo(() =>
    fixtures.filter(g => hasScore(g.Score1)&&hasScore(g.Score2))
      .slice().sort((a,b)=> (String(a.Date).localeCompare(String(b.Date)) || (toMinutes(a.Time)-toMinutes(b.Time)))).reverse().slice(0,5),
  [fixtures]);

  const upcoming = useMemo(() =>
    fixtures.filter(g => !hasScore(g.Score1)&&!hasScore(g.Score2))
      .slice().sort((a,b)=> (String(a.Date).localeCompare(String(b.Date)) || (toMinutes(a.Time)-toMinutes(b.Time)))).slice(0,5),
  [fixtures]);

  const wl = (g) => {
    if (!hasScore(g.Score1) || !hasScore(g.Score2)) return "";
    const s1=+g.Score1,s2=+g.Score2;
    const home = g.Team1 === teamName;
    const forAgainst = home ? [s1,s2] : [s2,s1];
    return forAgainst[0]>forAgainst[1]?"W":(forAgainst[0]<forAgainst[1]?"L":"D");
  };

  if (loading) return <div className="p-4">Loading team…</div>;
  if (err) return <div className="p-4 text-red-600">Error: {err}</div>;
  if (!stats) return <div className="p-4">Team not found. <Link to="/standings">Back</Link></div>;

  return (
    <div className="p-4" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/standings">← Back to {ageLabel} Standings</Link>
      </div>

      <h2 style={{ marginTop: 0 }}>{teamName}</h2>
      <div className="stats-grid">
        <Stat label="GP" value={stats.GP} />
        <Stat label="W"  value={stats.W} />
        <Stat label="D"  value={stats.D} />
        <Stat label="L"  value={stats.L} />
        <Stat label="Pts" value={stats.Points} />
      </div>

      <Section title="Recent Results">
        {played.length === 0 ? <Empty text="No matches yet" /> : played.map((g,i)=>(
          <Match key={i} g={g} right={`${g.Score1} - ${g.Score2}`} badge={wl(g)} />
        ))}
      </Section>

      <Section title="Upcoming Fixtures">
        {upcoming.length === 0 ? <Empty text="No upcoming fixtures" /> : upcoming.map((g,i)=>(
          <Match key={i} g={g} right="TBD" />
        ))}
      </Section>
    </div>
  );
}

function Stat({label, value}) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
function Section({title, children}) { return (<div style={{ marginBottom:16 }}><h3 style={{ margin:"8px 0" }}>{title}</h3><div style={{ display:"grid", gap:8 }}>{children}</div></div>); }
function Empty({text}) { return <div className="empty">{text}</div>; }
function Match({g, right, badge}) {
  return (
    <div className="card">
      <div className="match">
        <div className="time">{g.Date} {g.Time}</div>
        <div className="teams">
          <div>{g.Team1}</div>
          <div className="sub">{g.Team2}</div>
          <div className="meta">{g.Venue} • {g.Round}</div>
        </div>
        {badge ? <div className="badge">{badge}</div> : null}
        <div className="score">{right}</div>
      </div>
    </div>
  );
}
