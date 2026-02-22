import PropTypes from 'prop-types';
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { FilterSlotContext } from "./filterSlotContext";
import TournamentSwitcher from "./TournamentSwitcher";
import AnnouncementBanner from "./AnnouncementBanner";
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
      // Filter announcements by expires_at to show only active announcements
      const now = Date.now();
      const filtered = (data || []).filter(a => {
        if (!a.expires_at) return true; // No expiry set, show it
        return new Date(a.expires_at).getTime() > now; // Show if not expired
      });
      setAnnouncements(filtered);
    }
    void load();
  }, [location.pathname, activeTournamentId]);

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

  const hasAnnouncements = announcements.length > 0;
  const hasFilterContent = enableFilterSlot && filterContent;

  return (
    <FilterSlotContext.Provider value={filterContext}>
      <div className="app-shell min-h-screen bg-gray-50 flex flex-col">
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
                <TournamentSwitcher />
              </div>
            </div>

            {/* Announcements placed directly in header with tight spacing */}
            {hasAnnouncements && (
              <div style={{ padding: '0 12px', marginTop: '4px', marginBottom: '8px' }}>
                 <AnnouncementBanner announcements={announcements} />
              </div>
            )}

            {showNav && (
              <>
                {showAgeSelector && ageOptions.length > 0 && ageId && (
                  <div className="app-age-row">
                    <label className="age-chooser">
                      Age:
                      <select value={ageId} onChange={(e) => onAgeChange?.(e.target.value)}>
                        {ageOptions.map((g) => (
                          <option key={g.id} value={g.id}>{g.label || g.id}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <div className="app-nav-row">
                  <nav className="pills">
                    {navLinks.map((link) => (
                      <Link key={link.key} className={`pill ${currentTab === link.key ? "is-active" : ""}`} to={link.to}>
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </>
            )}
          </header>

          {/* GAP FIX: 
            Only render if hasFilterContent is true.
            Zero out everything if empty.
          */}
          <div 
             className="app-filter-slot" 
             style={{ 
               minHeight: hasFilterContent ? undefined : 0, 
               height: hasFilterContent ? 'auto' : 0,
               padding: hasFilterContent ? undefined : 0,
               overflow: 'hidden' // Ensure it cuts off any internal margins
             }}
          >
            {hasFilterContent && (
              <div className="app-filter-slot-inner" style={{ padding: '8px 12px' }}>
                {filterContent}
              </div>
            )}
          </div>

          <main className="app-main flex-1" style={{ paddingTop: hasAnnouncements ? '4px' : '12px' }}>
            {children}
          </main>

          <footer className="app-footer">
            Powered by <a href="https://www.lbdc.co.za" target="_blank" rel="noopener noreferrer">LBDC ↗</a>
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