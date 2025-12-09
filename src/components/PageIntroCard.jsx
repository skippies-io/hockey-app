import Card from "./Card";

export default function PageIntroCard({
  eyebrow,
  title,
  description,
  rightSlot = null,
}) {
  return (
    <Card className="page-intro-card">
      <div className="hj-section-header page-intro-main">
        {eyebrow && <div className="page-intro-eyebrow">{eyebrow}</div>}
        <h2 className="hj-section-header-title page-intro-title">{title}</h2>
        {description && <p className="hj-section-header-subtitle page-intro-desc">{description}</p>}
      </div>
      {rightSlot ? <div className="page-intro-right">{rightSlot}</div> : null}
    </Card>
  );
}
