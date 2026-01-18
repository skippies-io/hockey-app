import PropTypes from 'prop-types';

export default function PageHeading({ title, subtitle }) {
  return (
    <div className="page-heading">
      <h1 className="page-heading-title">{title}</h1>
      {subtitle && <p className="page-heading-sub">{subtitle}</p>}
    </div>
  );
}

PageHeading.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
};
