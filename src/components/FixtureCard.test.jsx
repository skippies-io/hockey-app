import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FixtureCard from './FixtureCard.jsx';

const BASE = {
  homeTeam: 'Home FC',
  awayTeam: 'Away FC',
};

describe('FixtureCard – status pills', () => {
  it('renders Live pill for status="live"', () => {
    render(<FixtureCard {...BASE} status="live" />);
    expect(screen.getByText('Live')).toBeTruthy();
  });

  it('renders Postponed pill for status="postponed"', () => {
    render(<FixtureCard {...BASE} status="postponed" />);
    expect(screen.getByText('Postponed')).toBeTruthy();
  });

  it('renders Cancelled pill for status="cancelled"', () => {
    render(<FixtureCard {...BASE} status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeTruthy();
  });

  it('renders TBC pill for status="tbc"', () => {
    render(<FixtureCard {...BASE} status="tbc" />);
    expect(screen.getByText('TBC')).toBeTruthy();
  });

  it('renders no pill for status="final"', () => {
    const { container } = render(<FixtureCard {...BASE} status="final" />);
    expect(container.querySelector('.fixture-card-status')).toBeNull();
  });

  it('renders no pill for status="upcoming"', () => {
    const { container } = render(<FixtureCard {...BASE} status="upcoming" />);
    expect(container.querySelector('.fixture-card-status')).toBeNull();
  });

  it('renders no pill when status is omitted', () => {
    const { container } = render(<FixtureCard {...BASE} />);
    expect(container.querySelector('.fixture-card-status')).toBeNull();
  });

  it('is case-insensitive for status values', () => {
    render(<FixtureCard {...BASE} status="LIVE" />);
    expect(screen.getByText('Live')).toBeTruthy();
  });
});

describe('FixtureCard – score rendering', () => {
  // Provide a time to prevent the time label from also rendering "TBD"
  const withTime = { ...BASE, time: '14:00' };

  it('shows TBD for both scores when scores are not provided', () => {
    const { container } = render(<FixtureCard {...withTime} />);
    const scoreEls = container.querySelectorAll('.fixture-team-score');
    expect(Array.from(scoreEls).every(el => el.textContent === 'TBD')).toBe(true);
  });

  it('shows TBD when homeScore is null', () => {
    const { container } = render(<FixtureCard {...withTime} homeScore={null} awayScore={null} />);
    const scoreEls = container.querySelectorAll('.fixture-team-score');
    expect(Array.from(scoreEls).every(el => el.textContent === 'TBD')).toBe(true);
  });

  it('shows TBD when homeScore is empty string', () => {
    const { container } = render(<FixtureCard {...withTime} homeScore="" awayScore="" />);
    const scoreEls = container.querySelectorAll('.fixture-team-score');
    expect(Array.from(scoreEls).every(el => el.textContent === 'TBD')).toBe(true);
  });

  it('renders numeric scores', () => {
    const { container } = render(<FixtureCard {...withTime} homeScore={3} awayScore={1} />);
    const scoreEls = container.querySelectorAll('.fixture-team-score');
    const texts = Array.from(scoreEls).map(el => el.textContent);
    expect(texts).toContain('3');
    expect(texts).toContain('1');
    expect(texts.includes('TBD')).toBe(false);
  });

  it('renders score 0 correctly (not TBD)', () => {
    const { container } = render(<FixtureCard {...withTime} homeScore={0} awayScore={0} />);
    const scoreEls = container.querySelectorAll('.fixture-team-score');
    const texts = Array.from(scoreEls).map(el => el.textContent);
    expect(texts).toEqual(['0', '0']);
  });

  it('renders string scores', () => {
    render(<FixtureCard {...withTime} homeScore="2" awayScore="4" />);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });
});

describe('FixtureCard – follow / unfollow buttons', () => {
  it('renders Follow aria-label when not followed', () => {
    render(<FixtureCard {...BASE} homeIsFollowed={false} awayIsFollowed={false} />);
    expect(screen.getByRole('button', { name: 'Follow Home FC' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Follow Away FC' })).toBeTruthy();
  });

  it('renders Unfollow aria-label when followed', () => {
    render(<FixtureCard {...BASE} homeIsFollowed awayIsFollowed />);
    expect(screen.getByRole('button', { name: 'Unfollow Home FC' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unfollow Away FC' })).toBeTruthy();
  });

  it('sets aria-pressed correctly', () => {
    render(<FixtureCard {...BASE} homeIsFollowed={false} awayIsFollowed />);
    const followHome = screen.getByRole('button', { name: 'Follow Home FC' });
    const unfollowAway = screen.getByRole('button', { name: 'Unfollow Away FC' });
    expect(followHome.getAttribute('aria-pressed')).toBe('false');
    expect(unfollowAway.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onToggleHomeFollow when home star is clicked', () => {
    const onToggleHomeFollow = vi.fn();
    render(<FixtureCard {...BASE} onToggleHomeFollow={onToggleHomeFollow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Follow Home FC' }));
    expect(onToggleHomeFollow).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleAwayFollow when away star is clicked', () => {
    const onToggleAwayFollow = vi.fn();
    render(<FixtureCard {...BASE} onToggleAwayFollow={onToggleAwayFollow} />);
    fireEvent.click(screen.getByRole('button', { name: 'Follow Away FC' }));
    expect(onToggleAwayFollow).toHaveBeenCalledTimes(1);
  });

  it('uses generic "team" label when homeTeam is a node', () => {
    render(<FixtureCard {...BASE} homeTeam={<span>Home FC</span>} />);
    expect(screen.getByRole('button', { name: 'Follow team' })).toBeTruthy();
  });
});

describe('FixtureCard – expandable behaviour', () => {
  const expandableProps = {
    ...BASE,
    expandable: true,
    venueName: 'Ice Palace',
    pool: 'Pool A',
    round: 'Round 1',
    notes: 'Sold out event',
  };

  it('is not expanded by default', () => {
    render(<FixtureCard {...expandableProps} />);
    expect(screen.queryByText('Venue: Ice Palace')).toBeNull();
  });

  it('exposes aria-expanded=false on the shell before expanding', () => {
    const { container } = render(<FixtureCard {...expandableProps} />);
    const shell = container.querySelector('.fixture-card-shell');
    expect(shell.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking the card shell toggles expanded details', () => {
    const { container } = render(<FixtureCard {...expandableProps} />);
    const shell = container.querySelector('.fixture-card-shell');
    fireEvent.click(shell);
    expect(screen.getByText('Venue: Ice Palace')).toBeTruthy();
    expect(screen.getByText('Pool: Pool A')).toBeTruthy();
    expect(screen.getByText('Round: Round 1')).toBeTruthy();
    expect(screen.getByText('Notes: Sold out event')).toBeTruthy();
  });

  it('clicking card again collapses the details', () => {
    const { container } = render(<FixtureCard {...expandableProps} />);
    const shell = container.querySelector('.fixture-card-shell');
    fireEvent.click(shell);
    expect(screen.getByText('Venue: Ice Palace')).toBeTruthy();
    fireEvent.click(shell);
    expect(screen.queryByText('Venue: Ice Palace')).toBeNull();
  });

  it('clicking a button inside the card does NOT toggle expand', () => {
    render(<FixtureCard {...expandableProps} />);
    const followBtn = screen.getByRole('button', { name: 'Follow Home FC' });
    fireEvent.click(followBtn);
    expect(screen.queryByText('Venue: Ice Palace')).toBeNull();
  });

  it('Enter key toggles expand', () => {
    const { container } = render(<FixtureCard {...expandableProps} />);
    const shell = container.querySelector('.fixture-card-shell');
    fireEvent.keyDown(shell, { key: 'Enter' });
    expect(screen.getByText('Venue: Ice Palace')).toBeTruthy();
  });

  it('Space key toggles expand', () => {
    const { container } = render(<FixtureCard {...expandableProps} />);
    const shell = container.querySelector('.fixture-card-shell');
    fireEvent.keyDown(shell, { key: ' ' });
    expect(screen.getByText('Venue: Ice Palace')).toBeTruthy();
  });

  it('other keys do not toggle expand', () => {
    const { container } = render(<FixtureCard {...expandableProps} />);
    const shell = container.querySelector('.fixture-card-shell');
    fireEvent.keyDown(shell, { key: 'Tab' });
    expect(screen.queryByText('Venue: Ice Palace')).toBeNull();
  });

  it('does NOT expand when expandable=false and card is clicked', () => {
    const { container } = render(
      <FixtureCard {...expandableProps} expandable={false} />
    );
    const shell = container.querySelector('.fixture-card-shell');
    fireEvent.click(shell);
    expect(screen.queryByText('Venue: Ice Palace')).toBeNull();
  });
});

describe('FixtureCard – date and meta display', () => {
  it('shows formatted date when showDate=true', () => {
    render(<FixtureCard {...BASE} date="2026-03-08" showDate />);
    expect(screen.getByText('08 Mar 2026')).toBeTruthy();
  });

  it('hides date when showDate=false', () => {
    render(<FixtureCard {...BASE} date="2026-03-08" showDate={false} />);
    expect(screen.queryByText('08 Mar 2026')).toBeNull();
  });

  it('shows time and venue in time line', () => {
    render(<FixtureCard {...BASE} time="14:00" venueName="The Rink" />);
    expect(screen.getByText('14:00 • The Rink')).toBeTruthy();
  });

  it('falls back to TBD in the time line when time is not provided', () => {
    const { container } = render(<FixtureCard {...BASE} homeScore={3} awayScore={1} />);
    const timeEl = container.querySelector('.fixture-card-time');
    expect(timeEl.textContent).toBe('TBD');
  });

  it('shows pool when showPool=true', () => {
    render(<FixtureCard {...BASE} pool="Pool B" showPool />);
    expect(screen.getByText('Pool B')).toBeTruthy();
  });

  it('hides pool when showPool=false', () => {
    render(<FixtureCard {...BASE} pool="Pool B" showPool={false} />);
    expect(screen.queryByText('Pool B')).toBeNull();
  });

  it('shows round when showRound=true', () => {
    render(<FixtureCard {...BASE} round="QF" showRound />);
    expect(screen.getByText('QF')).toBeTruthy();
  });
});

describe('FixtureCard – result pill', () => {
  it('renders W pill when showResultPill=true and resultPill="W"', () => {
    render(<FixtureCard {...BASE} showResultPill resultPill="W" />);
    expect(screen.getByText('W')).toBeTruthy();
  });

  it('renders D pill', () => {
    render(<FixtureCard {...BASE} showResultPill resultPill="D" />);
    expect(screen.getByText('D')).toBeTruthy();
  });

  it('renders L pill', () => {
    render(<FixtureCard {...BASE} showResultPill resultPill="L" />);
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('does not render result pill when showResultPill=false', () => {
    render(<FixtureCard {...BASE} showResultPill={false} resultPill="W" />);
    expect(screen.queryByText('W')).toBeNull();
  });
});
