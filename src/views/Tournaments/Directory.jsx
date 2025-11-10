import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getTournaments } from "../../lib/api";
import { loadTournamentList, saveTournamentList } from "../../lib/tournamentStore";
import { TournamentCard, TournamentFilters } from "../../components/tournaments";

const STATUS_ORDER = ["live", "upcoming", "past"];

function normalizeStatuses(param) {
  if (!param) return STATUS_ORDER;
  const list = param.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const filtered = list.filter(v => STATUS_ORDER.includes(v));
  return filtered.length ? filtered : STATUS_ORDER;
}

function formatStatusParam(statuses) {
  const allSelected = STATUS_ORDER.every(s => statuses.includes(s));
  return allSelected ? null : statuses.join(",");
}

function filterTournaments(groups, searchTerm, statuses) {
  const term = searchTerm.trim().toLowerCase();
  const active = statuses.length ? statuses : STATUS_ORDER;
  const result = {};
  active.forEach(status => {
    const list = (groups?.[status] || []).filter(item => {
      if (!term) return true;
      const haystack = [item.name, item.hostClub, item.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
    if (list.length) result[status] = list;
  });
  return result;
}

export default function TournamentDirectory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: null, data: null, source: "network" });
  const search = searchParams.get("q") ?? "";
  const statuses = normalizeStatuses(searchParams.get("status"));
  const season = new Date().getFullYear().toString();

  useEffect(() => {
    let alive = true;

    (async () => {
      const cached = await loadTournamentList(season);
      if (!alive) return;
      if (cached) setState({ loading: false, error: null, data: cached, source: "cache" });
      try {
        const fresh = await getTournaments({ season });
        if (!alive) return;
        setState({ loading: false, error: null, data: fresh, source: "network" });
        await saveTournamentList(season, fresh);
      } catch (err) {
        if (!alive) return;
        if (!cached) setState({ loading: false, error: err.message || String(err), data: null, source: "network" });
      }
    })();

    return () => { alive = false; };
  }, [season]);

  const grouped = useMemo(() => {
    if (!state.data) return {};
    return filterTournaments(state.data.tournaments || {}, search, statuses);
  }, [state.data, search, statuses]);

  const onFilterChange = ({ search: nextSearch, statuses: nextStatuses }) => {
    const params = new URLSearchParams();
    if (nextSearch) params.set("q", nextSearch);
    const statusParam = formatStatusParam(nextStatuses);
    if (statusParam) params.set("status", statusParam);
    setSearchParams(params);
  };

  const hasResults = Object.keys(grouped).length > 0;

  return (
    <div className="tournaments-page">
      <header className="tournaments-hero card">
        <div>
          <p className="eyebrow">Hockey4Juniors</p>
          <h1>Tournaments</h1>
          <p className="lead">Browse every tournament, past and present. Filter by lifecycle and search by club or city to jump straight into the details.</p>
        </div>
      </header>

      <TournamentFilters
        search={search}
        statuses={statuses}
        onChange={onFilterChange}
      />

      {state.loading && !state.data ? <p className="loading-indicator">Loading tournaments…</p> : null}
      {state.error && !state.data ? <p className="text-error">{state.error}</p> : null}

      {hasResults ? (
        STATUS_ORDER.map(status => {
          const list = grouped[status];
          if (!list || !list.length) return null;
          return (
            <section key={status} className="t-section">
              <div className="section-head">
                <h2>{status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Past"}</h2>
              </div>
              <div className="t-card-grid">
                {list.map(item => (
                  <TournamentCard key={item.slug || item.name} tournament={item} />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <div className="t-empty card">
          <p>No tournaments match your filters. Try adjusting your search or filter options.</p>
        </div>
      )}
    </div>
  );
}
