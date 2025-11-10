export default function OverviewSection({ title, children, actions }) {
  if (!children) return null;
  return (
    <section className="overview-section">
      <header className="overview-section__head">
        <h2>{title}</h2>
        {actions ? <div className="overview-section__actions">{actions}</div> : null}
      </header>
      <div className="overview-section__content">
        {children}
      </div>
    </section>
  );
}
