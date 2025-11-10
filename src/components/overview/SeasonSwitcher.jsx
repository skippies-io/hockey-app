export default function SeasonSwitcher({ season, availableSeasons = [], onChange }) {
  const seasons = Array.from(new Set(availableSeasons.concat([season]))).sort().reverse();
  return (
    <label className="season-switcher">
      <span>Select Season</span>
      <select value={season} onChange={e => onChange?.(e.target.value)}>
        {seasons.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </label>
  );
}
