import { Link } from "react-router-dom";

export default function AppLayout({
  children,
  ageOptions = [],
  selectedAge = "",
  onAgeChange,
  currentTab = "fixtures",
  showNav = true,
  showAgeSelector = true,
}) {
  const ageId = selectedAge || ageOptions[0]?.id || "";

  const navLinks = ageId
    ? [
        { key: "fixtures", label: "Fixtures", to: `/${ageId}/fixtures` },
        { key: "standings", label: "Standings", to: `/${ageId}/standings` },
        { key: "teams", label: "Teams", to: `/${ageId}/teams` },
        { key: "feedback", label: "Feedback", to: "/feedback" },
      ]
    : [{ key: "feedback", label: "Feedback", to: "/feedback" }];

  return (
    <div className="app-shell min-h-screen bg-gray-50 flex flex-col">
      <div className="app-shell-inner">
        <header className="app-header">
          <div className="app-header-inner">
            <Link to="/" className="brand-link">
              <div className="brand-row">
                <img
                  src={`${import.meta.env.BASE_URL}HJ_icon_192.png`}
                  alt="HJ Hockey For Juniors"
                  className="brand-logo"
                />
                <div className="brand-title">Hockey For Juniors</div>
              </div>
            </Link>

            {showNav && (
              <div className="app-header-controls">
                {showAgeSelector && ageOptions.length > 0 && ageId && (
                  <label className="age-chooser">
                    Age:
                    <select
                      value={ageId}
                      onChange={(e) => onAgeChange?.(e.target.value)}
                    >
                      {ageOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label || g.id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <nav className="pills" aria-label="Primary navigation">
                  {navLinks.map((link) => (
                    <Link
                      key={link.key}
                      className={`pill ${
                        currentTab === link.key ? "is-active" : ""
                      }`}
                      to={link.to}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>
        </header>

        <main className="app-main flex-1">{children}</main>

        <footer className="app-footer">
          Powered by{" "}
          <a
            href="https://www.lbdc.co.za"
            target="_blank"
            rel="noopener noreferrer"
          >
            LBDC ↗
          </a>
        </footer>
      </div>
    </div>
  );
}
