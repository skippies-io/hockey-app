import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StandingsRow from './StandingsRow.jsx';

const baseProps = {
  rank: 1,
  teamName: 'Team One',
  badgeColor: '#123456',
  initials: 'TO',
  played: 3,
  won: 2,
  drawn: 1,
  lost: 0,
  gf: 5,
  ga: 2,
  gd: 3,
  points: 7,
};

describe('StandingsRow', () => {
  it('does not render follow button when onToggleFollow is undefined', () => {
    render(<StandingsRow {...baseProps} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByLabelText('Follow team')).toBeNull();
    expect(screen.queryByLabelText('Unfollow team')).toBeNull();

    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText('TO')).toBeTruthy();
    expect(screen.getByText('Team One')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('renders follow button state and calls handler', () => {
    const onToggleFollow = vi.fn();
    const { rerender } = render(
      <StandingsRow {...baseProps} onToggleFollow={onToggleFollow} isFollowed={false} />
    );

    const followButton = screen.getByLabelText('Follow team');
    expect(followButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('☆')).toBeTruthy();

    fireEvent.click(followButton);
    expect(onToggleFollow).toHaveBeenCalledTimes(1);

    rerender(<StandingsRow {...baseProps} onToggleFollow={onToggleFollow} isFollowed={true} />);
    const unfollowButton = screen.getByLabelText('Unfollow team');
    expect(unfollowButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('★')).toBeTruthy();
  });
});
