import PropTypes from 'prop-types';

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

Card.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  followed: PropTypes.bool,
  noPad: PropTypes.bool,
};
