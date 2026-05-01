import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

function renderNav(props = {}) {
  return render(
    <MemoryRouter>
      <BottomNav {...props} />
    </MemoryRouter>
  );
}

describe('BottomNav – primary tabs', () => {
  it('renders Home, Fixtures, Standings, More tabs', () => {
    renderNav();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Fixtures')).toBeTruthy();
    expect(screen.getByText('Standings')).toBeTruthy();
    expect(screen.getByText('More')).toBeTruthy();
  });

  it('has bottom nav landmark with accessible label', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: 'Bottom navigation' })).toBeTruthy();
  });

  it('applies is-active class to the matching currentTab', () => {
    const { container } = renderNav({ currentTab: 'fixtures', ageId: 'u11' });
    const tabs = container.querySelectorAll('.bottom-nav-tab');
    const fixturesTab = Array.from(tabs).find((t) => t.textContent.includes('Fixtures'));
    expect(fixturesTab.classList.contains('is-active')).toBe(true);
  });

  it('does not apply is-active to non-matching tabs', () => {
    const { container } = renderNav({ currentTab: 'fixtures', ageId: 'u11' });
    const tabs = container.querySelectorAll('.bottom-nav-tab');
    const standingsTab = Array.from(tabs).find((t) => t.textContent.includes('Standings'));
    expect(standingsTab.classList.contains('is-active')).toBe(false);
  });

  it('applies is-active to Home when currentTab is home', () => {
    const { container } = renderNav({ currentTab: 'home' });
    const tabs = container.querySelectorAll('.bottom-nav-tab');
    const homeTab = Array.from(tabs).find((t) => t.textContent.includes('Home'));
    expect(homeTab.classList.contains('is-active')).toBe(true);
  });

  it('builds fixture link with ageId', () => {
    const { container } = renderNav({ ageId: 'u13' });
    const links = container.querySelectorAll('a.bottom-nav-tab');
    const fixturesLink = Array.from(links).find((l) => l.textContent.includes('Fixtures'));
    expect(fixturesLink.getAttribute('href')).toBe('/u13/fixtures');
  });

  it('builds standings link with ageId', () => {
    const { container } = renderNav({ ageId: 'u15' });
    const links = container.querySelectorAll('a.bottom-nav-tab');
    const standingsLink = Array.from(links).find((l) => l.textContent.includes('Standings'));
    expect(standingsLink.getAttribute('href')).toBe('/u15/standings');
  });
});

describe('BottomNav – More drawer', () => {
  it('drawer is not visible initially', () => {
    renderNav();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens drawer when More button is clicked', () => {
    renderNav({ ageId: 'u11' });
    const moreBtn = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreBtn);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('drawer contains secondary nav items', () => {
    renderNav({ ageId: 'u11' });
    fireEvent.click(screen.getByRole('button', { name: 'More navigation options' }));
    expect(screen.getByText('Teams')).toBeTruthy();
    expect(screen.getByText('Awards')).toBeTruthy();
    expect(screen.getByText('Tournaments')).toBeTruthy();
    expect(screen.getByText('Help')).toBeTruthy();
    expect(screen.getByText('Feedback')).toBeTruthy();
  });

  it('closes drawer when overlay is clicked', () => {
    const { container } = renderNav({ ageId: 'u11' });
    fireEvent.click(screen.getByRole('button', { name: 'More navigation options' }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    const overlay = container.querySelector('.bottom-nav-drawer-overlay');
    fireEvent.click(overlay);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('More button reflects aria-expanded state', () => {
    renderNav({ ageId: 'u11' });
    const moreBtn = screen.getByRole('button', { name: 'More navigation options' });
    expect(moreBtn.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(moreBtn);
    expect(moreBtn.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggling More twice closes the drawer', () => {
    renderNav({ ageId: 'u11' });
    const moreBtn = screen.getByRole('button', { name: 'More navigation options' });
    fireEvent.click(moreBtn);
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(moreBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
