export default function Card({ children, className = "", followed = false, ...rest }) {
  const cls = [
    "hj-card",
    "card",
    followed ? "hj-card--highlight card--followed" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
