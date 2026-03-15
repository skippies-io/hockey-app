import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import Card from "../components/Card";
import { getAwardsRows } from "../lib/api";
import { useTournament } from "../context/TournamentContext";

export default function Awards({ ageId }) {
  const [topScorers, setTopScorers] = useState([]);
  const [cleanSheets, setCleanSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const { activeTournament } = useTournament();
  const tournamentId = activeTournament?.id;

  const { ageId: routeAgeId } = useParams();
  const scopedAgeId = routeAgeId || ageId;
  const isAllAges = scopedAgeId === "all";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        if (!tournamentId) {
          setTopScorers([]);
          setCleanSheets([]);
          setLoading(false);
          return;
        }
        const result = await getAwardsRows(tournamentId, scopedAgeId);
        if (!alive) return;
        setTopScorers(result.topScorers || []);
        setCleanSheets(result.cleanSheets || []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scopedAgeId, tournamentId]);

  if (loading) {
    return (
      <div className="page-stack awards-page">
        <Card>Loading awards…</Card>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page-stack awards-page">
        <Card className="text-red-600">Error: {err}</Card>
      </div>
    );
  }

  if (topScorers.length === 0 && cleanSheets.length === 0) {
    return (
      <div className="page-stack awards-page">
        <Card>
          <div className="fixtures-empty-title">No awards data yet</div>
          <div className="fixtures-empty-hint">
            Results will appear here once match scores and scorers are entered.
          </div>
        </Card>
      </div>
    );
  }

  const showPool = (rows) => rows.some((r) => r.pool);

  return (
    <div className="page-stack awards-page">
      {topScorers.length > 0 && (
        <section className="page-section">
          <h3 className="section-title pool-head">Top Scorers</h3>
          <Card noPad>
            <table className="awards-table" aria-label="Top scorers">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th>Team</th>
                  {isAllAges && <th>Age</th>}
                  {showPool(topScorers) && <th>Pool</th>}
                  <th>Goals</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.map((s, i) => (
                  <tr key={`scorer-${i}`}>
                    <td>{i + 1}</td>
                    <td>{s.playerName}</td>
                    <td>{s.teamName}</td>
                    {isAllAges && <td>{s.ageId}</td>}
                    {showPool(topScorers) && <td>{s.pool || "—"}</td>}
                    <td>{s.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      {cleanSheets.length > 0 && (
        <section className="page-section">
          <h3 className="section-title pool-head">Clean Sheets</h3>
          <Card noPad>
            <table className="awards-table" aria-label="Clean sheets">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  {isAllAges && <th>Age</th>}
                  {showPool(cleanSheets) && <th>Pool</th>}
                  <th>Clean Sheets</th>
                </tr>
              </thead>
              <tbody>
                {cleanSheets.map((s, i) => (
                  <tr key={`cs-${i}`}>
                    <td>{i + 1}</td>
                    <td>{s.teamName}</td>
                    {isAllAges && <td>{s.ageId}</td>}
                    {showPool(cleanSheets) && <td>{s.pool || "—"}</td>}
                    <td>{s.cleanSheets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}

Awards.propTypes = {
  ageId: PropTypes.string,
};
