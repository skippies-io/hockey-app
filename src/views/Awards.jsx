import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";
import Card from "../components/Card";
import { getAwardsRows } from "../lib/api";
import { useTournament } from "../context/TournamentContext";

function AwardsTable({ ariaLabel, headers, rows, renderRow }) {
  return (
    <table className="awards-table" aria-label={ariaLabel}>
      <thead>
        <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>{rows.map((row, i) => renderRow(row, i))}</tbody>
    </table>
  );
}

AwardsTable.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  headers: PropTypes.arrayOf(PropTypes.string).isRequired,
  rows: PropTypes.array.isRequired,
  renderRow: PropTypes.func.isRequired,
};

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

  const scorerHeaders = ["#", "Player", "Team",
    ...(isAllAges ? ["Age"] : []),
    ...(showPool(topScorers) ? ["Pool"] : []),
    "Goals",
  ];

  const csHeaders = ["#", "Team",
    ...(isAllAges ? ["Age"] : []),
    ...(showPool(cleanSheets) ? ["Pool"] : []),
    "Clean Sheets",
  ];

  return (
    <div className="page-stack awards-page">
      {topScorers.length > 0 && (
        <section className="page-section">
          <h3 className="section-title pool-head">Top Scorers</h3>
          <Card noPad>
            <AwardsTable
              ariaLabel="Top scorers"
              headers={scorerHeaders}
              rows={topScorers}
              renderRow={(s, i) => (
                <tr key={`${s.teamName}-${s.playerName}`}>
                  <td>{i + 1}</td>
                  <td>{s.playerName}</td>
                  <td>{s.teamName}</td>
                  {isAllAges && <td>{s.ageId}</td>}
                  {showPool(topScorers) && <td>{s.pool || "—"}</td>}
                  <td>{s.goals}</td>
                </tr>
              )}
            />
          </Card>
        </section>
      )}

      {cleanSheets.length > 0 && (
        <section className="page-section">
          <h3 className="section-title pool-head">Clean Sheets</h3>
          <Card noPad>
            <AwardsTable
              ariaLabel="Clean sheets"
              headers={csHeaders}
              rows={cleanSheets}
              renderRow={(s, i) => (
                <tr key={`${s.teamName}-${s.ageId || i}`}>
                  <td>{i + 1}</td>
                  <td>{s.teamName}</td>
                  {isAllAges && <td>{s.ageId}</td>}
                  {showPool(cleanSheets) && <td>{s.pool || "—"}</td>}
                  <td>{s.cleanSheets}</td>
                </tr>
              )}
            />
          </Card>
        </section>
      )}
    </div>
  );
}

Awards.propTypes = {
  ageId: PropTypes.string,
};
