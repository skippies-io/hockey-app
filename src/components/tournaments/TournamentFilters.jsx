import { useCallback } from "react";

const OPTIONS = [
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export default function TournamentFilters({ search, statuses, onChange }) {
  const toggleStatus = useCallback((value) => {
    const next = new Set(statuses);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    onChange({ search, statuses: Array.from(next) });
  }, [statuses, onChange, search]);

  return (
    <div className="t-filters card">
      <div className="t-filters__row">
        <label htmlFor="t-search" className="sr-only">Search tournaments</label>
        <input
          id="t-search"
          type="search"
          placeholder="Search by name, host, or city"
          value={search}
          onChange={e => onChange({ search: e.target.value, statuses })}
        />
      </div>
      <div className="t-filters__chips">
        {OPTIONS.map(opt => (
          <button
            type="button"
            key={opt.value}
            className={`filter-chip ${statuses.includes(opt.value) ? "is-active" : ""}`}
            onClick={() => toggleStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
