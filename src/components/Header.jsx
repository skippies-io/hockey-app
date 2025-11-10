import { Link, useLocation } from "react-router-dom";
import logo from "../assets/hj_logo.jpg";

export default function Header() {
  const location = useLocation();
  const isTournaments = location.pathname.startsWith("/tournaments");
  const linkHref = isTournaments ? "/overview" : "/tournaments";
  const linkLabel = isTournaments ? "← Back to Overview" : "View Tournaments →";

  return (
    <header className="app-header">
      <div className="app-header__left">
        <img src={logo} alt="Hockey4Juniors" className="app-header__logo" />
        <div className="app-header__text">
          <p className="app-header__eyebrow">Hockey App</p>
          <span className="app-header__title">Hockey4Juniors</span>
        </div>
      </div>
      <Link className="app-header__link" to={linkHref}>{linkLabel}</Link>
    </header>
  );
}
