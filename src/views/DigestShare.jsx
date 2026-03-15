import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDigestShare, getStandingsRows, getFixturesRows } from "../lib/api";
import Card from "../components/Card";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function StandingsSection({ tournamentId, ageId, ageLabel }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStandingsRows(tournamentId, ageId)
      .then((data) => { if (alive) { setRows(data); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [tournamentId, ageId]);

  if (loading) return <p className="digest-loading">Loading standings…</p>;
  if (err) return <p className="digest-error">Error: {err}</p>;
  if (!rows.length) return <p className="digest-empty">No standings data.</p>;

  return (
    <section aria-label={`Standings${ageLabel ? ` — ${ageLabel}` : ""}`}>
      {ageLabel && <h2 className="digest-section-heading">Standings — {ageLabel}</h2>}
      <table className="digest-table" aria-label="Standings">
        <thead>
          <tr>
            <th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.Team || i}>
              <td>{r.Rank || i + 1}</td>
              <td>{r.Team}</td>
              <td>{r.GP ?? ""}</td>
              <td>{r.W ?? ""}</td>
              <td>{r.D ?? ""}</td>
              <td>{r.L ?? ""}</td>
              <td>{r.GF ?? ""}</td>
              <td>{r.GA ?? ""}</td>
              <td>{r.GD ?? ""}</td>
              <td><strong>{r.Points ?? ""}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

StandingsSection.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  ageId: PropTypes.string.isRequired,
  ageLabel: PropTypes.string,
};

function FixturesSection({ tournamentId, ageId, ageLabel }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getFixturesRows(tournamentId, ageId)
      .then((data) => { if (alive) { setRows(data); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [tournamentId, ageId]);

  if (loading) return <p className="digest-loading">Loading fixtures…</p>;
  if (err) return <p className="digest-error">Error: {err}</p>;
  if (!rows.length) return <p className="digest-empty">No fixtures found.</p>;

  return (
    <section aria-label={`Fixtures${ageLabel ? ` — ${ageLabel}` : ""}`}>
      {ageLabel && <h2 className="digest-section-heading">Fixtures — {ageLabel}</h2>}
      <table className="digest-table" aria-label="Fixtures">
        <thead>
          <tr>
            <th>Date</th><th>Time</th><th>Home</th><th>Score</th><th>Away</th><th>Venue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => (
            <tr key={i}>
              <td>{f.Date || ""}</td>
              <td>{f.Time || ""}</td>
              <td>{f.Team1 || ""}</td>
              <td>
                {f.Score1 !== "" && f.Score1 != null && f.Score2 !== "" && f.Score2 != null
                  ? `${f.Score1} – ${f.Score2}`
                  : "vs"}
              </td>
              <td>{f.Team2 || ""}</td>
              <td>{f.Venue || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

FixturesSection.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  ageId: PropTypes.string.isRequired,
  ageLabel: PropTypes.string,
};

export default function DigestShare() {
  const { token } = useParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!token) { setErr("Missing share token."); setLoading(false); return; }
    let alive = true;
    getDigestShare(token)
      .then((j) => { if (alive) { setConfig(j.config); setLoading(false); } })
      .catch((e) => { if (alive) { setErr(e.message || "Invalid or expired link."); setLoading(false); } });
    return () => { alive = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="digest-share-page">
        <Card><p>Loading…</p></Card>
      </div>
    );
  }

  if (err) {
    return (
      <div className="digest-share-page">
        <Card>
          <h1 className="digest-share-title">Link not found</h1>
          <p className="digest-error">{err}</p>
          <p>This link may have expired or been revoked.</p>
        </Card>
      </div>
    );
  }

  const { tournament_id, age_id, label, expires_at } = config;
  const title = label || (age_id ? `${age_id} Digest` : "Tournament Digest");

  return (
    <div className="digest-share-page">
      <Card>
        <h1 className="digest-share-title">{title}</h1>
        {expires_at && (
          <p className="digest-share-expiry">
            Valid until {formatDate(expires_at)}
          </p>
        )}
      </Card>

      <Card>
        <StandingsSection
          tournamentId={tournament_id}
          ageId={age_id || "all"}
          ageLabel={age_id || ""}
        />
      </Card>

      <Card>
        <FixturesSection
          tournamentId={tournament_id}
          ageId={age_id || "all"}
          ageLabel={age_id || ""}
        />
      </Card>
    </div>
  );
}
