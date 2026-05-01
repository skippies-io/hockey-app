import PropTypes from 'prop-types';
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FilterSlotContext } from "./filterSlotContext";
import TournamentSwitcher from "./TournamentSwitcher";
import AnnouncementBanner from "./AnnouncementBanner";
import NotificationBell from "./NotificationBell";
import BottomNav from "./BottomNav";
import ThemeToggle from "./ThemeToggle";
import { getAnnouncements } from "../lib/api";
import { useTournament } from "../context/TournamentContext";

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
  const location = useLocation();
  const { activeTournamentId } = useTournament() || {};

  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    async function load() {
      const isHome = location.pathname === '/';
      const targetId = isHome ? null : activeTournamentId;
      const data = await getAnnouncements(targetId);
      setAnnouncements(data || []);
    }
    void load();
  }, [location.pathname, activeTournamentId]);

  const navLinks = ageId
    ? [
        { key: "fixtures", label: "Fixtures", to: `/${ageId}/fixtures` },
        { key: "standings", label: "Standings", to: `/${ageId}/standings` },
        { key: "teams", label: "Teams", to: `/${ageId}/teams` },
        { key: "awards", label: "Awards", to: `/${ageId}/awards` },
        { key: "tournaments", label: "Tournaments", to: "/tournaments" },
        { key: "feedback", label: "Feedback", to: "/feedback" },
        { key: "help", label: "Help", to: "/help" },
      ]
    : [
        { key: "tournaments", label: "Tournaments", to: "/tournaments" },
        { key: "feedback", label: "Feedback", to: "/feedback" },
        { key: "help", label: "Help", to: "/help" },
      ];

  const [slot, setSlot] = useState(filters);
  useEffect(() => {
    setSlot(filters);
  }, [filters]);

  const filterContext = useMemo(() => ({ setFilters: setSlot }), []);
  const filterContent = slot || filters;

  const hasAnnouncements = announcements.length > 0;

  // Age chooser node — rendered in both desktop header and mobile filter strip
  const ageChooser = showNav && showAgeSelector && ageOptions.length > 0 && ageId ? (
    <label className="age-chooser">
      Age:
      <select value={ageId} onChange={(e) => onAgeChange?.(e.target.value)}>
        {ageOptions.map((g) => (
          <option key={g.id} value={g.id}>{g.label || g.id}</option>
        ))}
      </select>
    </label>
  ) : null;

  // On mobile the age chooser merges into the filter strip; filter strip always renders when either exists
  const hasFilterStrip = enableFilterSlot && (filterContent || ageChooser);

  return (
    <FilterSlotContext.Provider value={filterContext}>
      <div className="app-shell min-h-screen bg-gray-50 flex flex-col">
        <a href="#main-content" className="skip-nav">Skip to main content</a>
        <div className="app-shell-inner flex flex-col flex-1">
          <header className="app-header">
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
              <div className="header-actions">
                <ThemeToggle />
                <NotificationBell announcements={announcements} />
                <TournamentSwitcher />
              </div>
            </div>

            {hasAnnouncements && (
              <div style={{ padding: '0 12px', marginTop: '4px', marginBottom: '8px' }}>
                <AnnouncementBanner announcements={announcements} />
              </div>
            )}

            {/* Age selector — desktop only; on mobile it moves into the filter strip below */}
            {ageChooser && (
              <div className="app-age-row app-age-row--desktop">
                {ageChooser}
              </div>
            )}

            {showNav && (
              <div className="app-nav-row">
                <nav className="pills" aria-label="Main navigation">
                  {navLinks.map((link) => (
                    <Link
                      key={link.key}
                      className={`pill ${currentTab === link.key ? "is-active" : ""}`}
                      to={link.to}
                      aria-current={currentTab === link.key ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </header>

          {/* Filter strip: age chooser (mobile) + page filters, one compact row */}
          {hasFilterStrip && (
            <div className="app-filter-slot">
              <div className="app-filter-slot-inner">
                {/* Age chooser visible only on mobile (desktop shows it in header) */}
                {ageChooser && (
                  <span className="app-age-inline">
                    {ageChooser}
                  </span>
                )}
                {filterContent && (
                  <span className="app-filter-content">
                    {filterContent}
                  </span>
                )}
              </div>
            </div>
          )}

          <main id="main-content" className="app-main flex-1" style={{ paddingTop: hasAnnouncements ? '4px' : '12px' }}>
            {children}
          </main>

          <footer className="app-footer">
            Powered by <a href="https://www.lbdc.co.za" target="_blank" rel="noopener noreferrer">LBDC ↗</a>
          </footer>
        </div>
      </div>

      {/* Bottom navigation — visible on mobile only (CSS hides it at ≥640px) */}
      <BottomNav currentTab={currentTab} ageId={ageId} />
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
