export default function Card({
  children,
  className = "",
  followed = false,
  noPad = false,
  ...rest
}) {
  const cls = [
    "hj-card",
    "card",
    followed ? "hj-card--highlight card--followed" : "",
    noPad ? "hj-card--no-pad" : "",
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
