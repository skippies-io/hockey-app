import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const PRIMARY_TABS = [
  { key: 'home',      label: 'Home',     icon: 'home',          getTo: () => '/' },
  { key: 'fixtures',  label: 'Fixtures', icon: 'sports_hockey', getTo: (age) => `/${age}/fixtures` },
  { key: 'standings', label: 'Standings',icon: 'leaderboard',   getTo: (age) => `/${age}/standings` },
  { key: 'more',      label: 'More',     icon: 'more_horiz',    getTo: null },
];

const MORE_ITEMS = [
  { key: 'teams',       label: 'Teams',       icon: 'groups',          getTo: (age) => `/${age}/teams` },
  { key: 'awards',      label: 'Awards',      icon: 'emoji_events',    getTo: (age) => `/${age}/awards` },
  { key: 'tournaments', label: 'Tournaments', icon: 'public',          getTo: () => '/tournaments' },
  { key: 'franchises',  label: 'Clubs',       icon: 'shield',          getTo: () => '/franchises' },
  { key: 'help',        label: 'Help',        icon: 'help_outline',    getTo: () => '/help' },
  { key: 'feedback',    label: 'Feedback',    icon: 'rate_review',     getTo: () => '/feedback' },
];

export default function BottomNav({ currentTab = '', ageId = '' }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const closeDrawer = () => setDrawerOpen(false);

  const handleMoreItem = (getTo) => {
    const path = getTo(ageId);
    closeDrawer();
    navigate(path);
  };

  return (
    <>
      {drawerOpen && (
        <>
          <div
            className="bottom-nav-drawer-overlay"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            className="bottom-nav-drawer"
            role="dialog"
            aria-label="More navigation options"
          >
            <p className="bottom-nav-drawer-title">More</p>
            <div className="bottom-nav-drawer-grid">
              {MORE_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="bottom-nav-drawer-item"
                  onClick={() => handleMoreItem(item.getTo)}
                >
                  <span className="bottom-nav-drawer-item-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <nav className="bottom-nav" aria-label="Bottom navigation">
        <div className="bottom-nav-inner">
          {PRIMARY_TABS.map((tab) => {
            const isActive = currentTab === tab.key;

            if (tab.key === 'more') {
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`bottom-nav-tab${isActive || drawerOpen ? ' is-active' : ''}`}
                  onClick={() => setDrawerOpen((v) => !v)}
                  aria-expanded={drawerOpen}
                  aria-label="More navigation options"
                >
                  <span className="bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
                  <span className="bottom-nav-label">{tab.label}</span>
                </button>
              );
            }

            const to = tab.getTo(ageId);
            return (
              <Link
                key={tab.key}
                to={to}
                className={`bottom-nav-tab${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={closeDrawer}
              >
                <span className="bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
                <span className="bottom-nav-label">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

BottomNav.propTypes = {
  currentTab: PropTypes.string,
  ageId: PropTypes.string,
};
