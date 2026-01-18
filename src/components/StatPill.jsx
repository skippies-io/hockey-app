import PropTypes from 'prop-types';

export default function StatPill({ label, value, emphasis = "normal" }) {
  const valueStyle =
    emphasis === "strong" ? { fontWeight: "var(--hj-font-weight-bold)" } : undefined;

  return (
    <div className="hj-stat-pill">
      <div className="hj-stat-pill-value" style={valueStyle}>
        {value}
      </div>
      <div className="hj-stat-pill-label">{label}</div>
    </div>
  );
}

StatPill.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  emphasis: PropTypes.oneOf(['normal', 'strong']),
};
