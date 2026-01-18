import PropTypes from 'prop-types';
import Card from "./Card";

export default function FilterBar({
  rightSlot = null,
  showFavourites = false,
  onToggleFavourites,
  favouritesCount = 0,
  favouritesLabel = "Show only followed teams",
  showHelp = true,
}) {
  const muted = favouritesCount === 0;

  return (
    <Card className="filters-card filter-slot-card">
      <div className="filter-slot-row">
        {rightSlot}

        <label
          className="hj-checkbox-label filter-toggle"
          style={muted ? { color: "var(--hj-color-ink-muted)" } : undefined}
        >
          <input
            type="checkbox"
            checked={!!showFavourites}
            onChange={(e) => onToggleFavourites?.(e.target.checked)}
          />
          {favouritesLabel} ({favouritesCount || 0})
          {muted && showHelp && (
            <div className="filter-help">
              You haven’t followed any teams yet. Tap the ☆ next to a team to follow it.
            </div>
          )}
        </label>
      </div>
    </Card>
  );
}

FilterBar.propTypes = {
  rightSlot: PropTypes.node,
  showFavourites: PropTypes.bool,
  onToggleFavourites: PropTypes.func,
  favouritesCount: PropTypes.number,
  favouritesLabel: PropTypes.string,
  showHelp: PropTypes.bool,
};
