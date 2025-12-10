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
