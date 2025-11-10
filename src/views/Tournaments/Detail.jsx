import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTournamentDetail } from "../../lib/api";
import { loadTournamentDetail, saveTournamentDetail } from "../../lib/tournamentStore";
import Fixtures from "../../components/Fixtures";
import Standings from "../../components/Standings";

const TABS = ["overview", "fixtures", "standings", "awards"];
const TAB_LABELS = {
  overview: "Overview",
  fixtures: "Fixtures",
  standings: "Standings",
  awards: "Awards",
};

const STATUS_LABEL = { live: "Live", upcoming: "Upcoming", past: "Past" };

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return "Dates TBA";
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" });
  if (start && end) {
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${fmt.format(start)} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${fmt.format(start)} – ${fmt.format(end)}, ${end.getFullYear()}`;
  }
  if (start) return fmt.format(start);
  return fmt.format(end);
}

function ResourceList({ resources = [] }) {
  if (!resources.length) return <p>No resources shared yet.</p>;
  return (
    <ul className="t-resource-list">
      {resources.map((res, idx) => (
        <li key={`${res.url}-${idx}`}>
          <a href={res.url} target="_blank" rel="noopener noreferrer">
            {res.label || res.type || "Resource"}
          </a>
        </li>
      ))}
    </ul>
  );
}

function DivisionsList({ divisions = [], tournamentSlug }) {
  if (!divisions.length) return <p>Divisions will appear once published.</p>;
  return (
    <div className="t-division-grid">
      {divisions.map(div => (
        <div key={div.divisionId} className="t-division-card">
          <p className="t-division-name">{div.divisionLabel || div.divisionId}</p>
          <p className="t-division-meta">{div.teamCount ? `${div.teamCount} teams` : "Team count TBA"}</p>
          <div className="t-division-links">
            <Link to={`/${div.divisionId}/fixtures?tournament=${div.tournamentSlug || tournamentSlug || ""}`}>View fixtures</Link>
            <Link to={`/${div.divisionId}/standings?tournament=${div.tournamentSlug || tournamentSlug || ""}`}>View standings</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactList({ contacts = [], email }) {
  if (!contacts.length && !email) return null;
  return (
    <ul className="t-contact-list">
      {contacts.map((person, idx) => (
        <li key={`${person.email || person.phone || idx}`}>
          <strong>{person.name || "Organizer"}</strong>
          {person.email ? <span> • <a href={`mailto:${person.email}`}>{person.email}</a></span> : null}
          {person.phone ? <span> • {person.phone}</span> : null}
        </li>
      ))}
      {email ? (
        <li>
          <strong>General contact</strong> • <a href={`mailto:${email}`}>{email}</a>
        </li>
      ) : null}
    </ul>
  );
}

export default function TournamentDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null, data: null, tab: "overview" });
  const [selectedDivision, setSelectedDivision] = useState(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const cached = await loadTournamentDetail(slug);
      if (!alive) return;
      if (cached) {
        setState(prev => ({ ...prev, loading: false, data: cached }));
        setSelectedDivision(cached.divisions?.[0] || null);
      }
      try {
        const fresh = await getTournamentDetail(slug);
        if (!alive) return;
        setState(prev => ({ ...prev, loading: false, data: fresh }));
        setSelectedDivision(fresh.divisions?.[0] || null);
        await saveTournamentDetail(slug, fresh);
      } catch (err) {
        if (!alive) return;
        setState(prev => ({ ...prev, loading: false, error: err.message || String(err) }));
      }
    })();

    return () => { alive = false; };
  }, [slug]);

  const detail = state.data;
  const isLive = detail?.derivedStatus === "live";
  const refreshInterval = isLive ? 60000 : 0;

  useEffect(() => {
    if (!state.error) return;
    const timeout = setTimeout(() => navigate("/tournaments", { replace: true }), 2500);
    return () => clearTimeout(timeout);
  }, [state.error, navigate]);

  const heroDate = formatDateRange(detail?.startDate, detail?.endDate);
  const location = [detail?.venueName, detail?.city].filter(Boolean).join(" • ");
  const statusLabel = STATUS_LABEL[detail?.derivedStatus] || detail?.status || "Upcoming";

  const divisions = useMemo(() => detail?.divisions || [], [detail?.divisions]);
  const divisionOptions = useMemo(() => divisions.map(div => ({ value: div.divisionId, label: div.divisionLabel || div.divisionId })), [divisions]);

  useEffect(() => {
    if (!selectedDivision && divisions.length) setSelectedDivision(divisions[0]);
  }, [divisions, selectedDivision]);

  if (state.loading && !detail) {
    return <div className="tournament-detail"><p className="loading-indicator">Loading tournament…</p></div>;
  }

  if (state.error && !detail) {
    return <div className="tournament-detail"><p className="text-error">{state.error}</p></div>;
  }

  if (!detail) return null;

  return (
    <div className="tournament-detail">
      <header className="t-detail-hero card">
        <div className="hero-left">
          <div>
            <p className="eyebrow">Tournament</p>
            <h1>{detail.name}</h1>
            <p className="lead">Hosted by {detail.hostClub || "Unknown club"}</p>
            <p className="hero-meta">{heroDate}</p>
            <p className="hero-meta">{location || "Venue TBA"}</p>
            {detail.contactEmail ? (
              <a className="hero-contact" href={`mailto:${detail.contactEmail}`}>Contact organizer</a>
            ) : null}
          </div>
        </div>
        <div className="hero-actions">
          <span className={`status-chip status-${detail.derivedStatus || detail.status || "upcoming"}`}>{statusLabel}</span>
          <Link to="/tournaments" className="btn-link">← Back to Tournaments</Link>
        </div>
      </header>

      <nav className="t-tabs" aria-label="Tournament sections">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`t-tab ${state.tab === tab ? "is-active" : ""}`}
            onClick={() => setState(prev => ({ ...prev, tab }))}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <section className="card t-tab-panel">
        {state.tab === "overview" ? (
          <div className="t-overview">
            <div>
              <h2>About this tournament</h2>
              <p>{detail.description || "Tournament description coming soon."}</p>
            </div>
            <div>
              <h3>Resources</h3>
              <ResourceList resources={detail.resources} />
            </div>
            <div>
              <h3>Contacts</h3>
              <ContactList contacts={detail.contacts} email={detail.contactEmail} />
            </div>
            <div>
              <h3>Divisions</h3>
              <DivisionsList divisions={detail.divisions} tournamentSlug={detail.slug} />
            </div>
          </div>
        ) : null}

        {state.tab === "fixtures" ? (
          divisions.length ? (
            <div className="t-tab-content">
              <div className="t-division-picker">
                <label htmlFor="fixtures-division">Division</label>
                <select
                  id="fixtures-division"
                  value={selectedDivision?.divisionId || ""}
                  onChange={e => setSelectedDivision(divisions.find(d => d.divisionId === e.target.value) || null)}
                >
                  {divisionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {selectedDivision ? (
                <Fixtures
                  ageId={selectedDivision.divisionId}
                  ageLabel={selectedDivision.divisionLabel || selectedDivision.divisionId}
                  tournamentSlug={detail.slug}
                  refreshIntervalMs={refreshInterval}
                />
              ) : <p>No division selected.</p>}
            </div>
          ) : <p>No divisions available yet.</p>
        ) : null}

        {state.tab === "standings" ? (
          divisions.length ? (
            <div className="t-tab-content">
              <div className="t-division-picker">
                <label htmlFor="standings-division">Division</label>
                <select
                  id="standings-division"
                  value={selectedDivision?.divisionId || ""}
                  onChange={e => setSelectedDivision(divisions.find(d => d.divisionId === e.target.value) || null)}
                >
                  {divisionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {selectedDivision ? (
                <Standings
                  ageId={selectedDivision.divisionId}
                  ageLabel={selectedDivision.divisionLabel || selectedDivision.divisionId}
                  tournamentSlug={detail.slug}
                  refreshIntervalMs={refreshInterval}
                />
              ) : <p>No division selected.</p>}
            </div>
          ) : <p>No divisions available yet.</p>
        ) : null}

        {state.tab === "awards" ? (
          detail.awards?.length ? (
            <ul className="t-awards">
              {detail.awards.map((award, idx) => (
                <li key={idx}>
                  <strong>{award.title || "Award"}</strong>
                  <span>{award.recipient || "TBD"}</span>
                </li>
              ))}
            </ul>
          ) : <p>Awards will appear once tournaments conclude.</p>
        ) : null}
      </section>
    </div>
  );
}
