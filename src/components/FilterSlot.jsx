import Card from "./Card";

export function FilterSlotCard({ children }) {
  return (
    <Card className="filters-card filter-slot-card">
      <div className="filter-slot-row">{children}</div>
    </Card>
  );
}

export function FollowToggle({
  count = 0,
  checked = false,
  onChange,
  label = "Show only followed teams",
  showHelp = true,
}) {
  const muted = count === 0;
  return (
    <label
      className="hj-checkbox-label filter-toggle"
      style={muted ? { color: "var(--hj-color-ink-muted)" } : undefined}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      {label} ({count || 0})
      {muted && showHelp && (
        <div className="filter-help">
          You haven’t followed any teams yet. Tap the ☆ next to a team to follow it.
        </div>
      )}
    </label>
  );
}
