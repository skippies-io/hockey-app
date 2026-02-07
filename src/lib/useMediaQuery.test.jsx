import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import PropTypes from "prop-types";
import useMediaQuery from './useMediaQuery.js';

const MatchView = ({ query }) => {
  const matches = useMediaQuery(query);
  return <div>{matches ? 'match' : 'nope'}</div>;
};

MatchView.propTypes = {
  query: PropTypes.string.isRequired,
};

const setupMatchMedia = ({ matches = false, modern = true } = {}) => {
  const listeners = new Set();
  const mql = {
    matches,
    media: '(min-width: 800px)',
    addEventListener: modern
      ? vi.fn((event, cb) => {
        if (event === 'change') listeners.add(cb);
      })
      : undefined,
    removeEventListener: modern
      ? vi.fn((event, cb) => {
        if (event === 'change') listeners.delete(cb);
      })
      : undefined,
    addListener: !modern
      ? vi.fn((cb) => {
        listeners.add(cb);
      })
      : undefined,
    removeListener: !modern
      ? vi.fn((cb) => {
        listeners.delete(cb);
      })
      : undefined,
    _trigger(next) {
      mql.matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
    _listeners: listeners,
  };

  window.matchMedia = vi.fn(() => mql);
  return mql;
};

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('uses modern addEventListener/removeEventListener and updates on change', () => {
    const mql = setupMatchMedia({ matches: true, modern: true });
    const { unmount } = render(<MatchView query="(min-width: 800px)" />);

    expect(screen.getByText('match')).toBeTruthy();
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mql._listeners.size).toBe(1);

    act(() => {
      mql._trigger(false);
    });
    expect(screen.getByText('nope')).toBeTruthy();

    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(mql._listeners.size).toBe(0);
  });

  it('uses legacy addListener/removeListener and updates on change', () => {
    const mql = setupMatchMedia({ matches: false, modern: false });
    const { unmount } = render(<MatchView query="(min-width: 800px)" />);

    expect(screen.getByText('nope')).toBeTruthy();
    expect(mql.addListener).toHaveBeenCalledWith(expect.any(Function));
    expect(mql._listeners.size).toBe(1);

    act(() => {
      mql._trigger(true);
    });
    expect(screen.getByText('match')).toBeTruthy();

    unmount();
    expect(mql.removeListener).toHaveBeenCalledWith(expect.any(Function));
    expect(mql._listeners.size).toBe(0);
  });

  it('returns false when matchMedia is unavailable', () => {
    delete window.matchMedia;
    render(<MatchView query="(min-width: 800px)" />);
    expect(screen.getByText('nope')).toBeTruthy();
  });
});
