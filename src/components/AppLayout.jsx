import PropTypes from 'prop-types';
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FilterSlotContext } from "./filterSlotContext";
import TournamentSwitcher from "./TournamentSwitcher";

export default function AppLayout({
  children,
  ageOptions = [],
  selectedAge = "",
  onAgeChange,
  currentTab = "fixtures",
  showNav = true,
  showAgeSelector = true,
  enableFilterSlot = true,
  filters = null,
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

  const [slot, setSlot] = useState(filters);
  useEffect(() => {
    setSlot(filters);
  }, [filters]);
  const filterContext = useMemo(() => ({ setFilters: setSlot }), []);
  const filterContent = slot || filters;

  return (
    <FilterSlotContext.Provider value={filterContext}>
      <div className="app-shell min-h-screen bg-gray-50 flex flex-col">
        <div className="app-shell-inner">
          <header className="app-header">
            {/* Top Row: Logo, Title, and Tournament Selector */}
            <div className="app-header-top">
              <div className="header-main">
                <div className="header-brand">
                  <Link to="/" className="brand-link">
                    <img
                      src={`${import.meta.env.BASE_URL}HJ_icon_192.png`}
                      alt="HJ Hockey For Juniors"
                      className="app-logo"
                      style={{ height: '2.5rem', width: 'auto' }}
                    />
                    <h1 className="app-title">Hockey For Juniors</h1>
                  </Link>
                </div>
              </div>
              
              {/* Bottom Row: The Selector (Restored) */}
              <div className="header-actions">
                <TournamentSwitcher />
              </div>
            </div>

            {showNav && (
              <>
                {showAgeSelector && ageOptions.length > 0 && ageId && (
                  <div className="app-age-row">
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
                  </div>
                )}

                <div className="app-nav-row">
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
              </>
            )}
          </header>

          <div className="app-filter-slot" aria-label="Filters">
            {enableFilterSlot && filterContent ? (
              <div className="app-filter-slot-inner">{filterContent}</div>
            ) : (
              <div className="filter-slot-placeholder" aria-hidden="true" />
            )}
          </div>

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
    </FilterSlotContext.Provider>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node,
  ageOptions: PropTypes.array,
  selectedAge: PropTypes.string,
  onAgeChange: PropTypes.func,
  currentTab: PropTypes.string,
  showNav: PropTypes.bool,
  showAgeSelector: PropTypes.bool,
  enableFilterSlot: PropTypes.bool,
  filters: PropTypes.node,
};
