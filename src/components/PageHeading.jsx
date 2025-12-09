export default function PageHeading({ title, subtitle }) {
  return (
    <div className="page-heading">
      <h1 className="page-heading-title">{title}</h1>
      {subtitle && <p className="page-heading-sub">{subtitle}</p>}
    </div>
  );
}
