import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeTeamFollowKey, readFollows, isFollowing, toggleFollow, clearFollows } from './follows.js';

const buildStorage = () => {
  let store = new Map();
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, value);
    }),
    clear: () => {
      store = new Map();
    },
    _dump: () => store,
  };
};

describe('follows helpers', () => {
  const originalStorage = globalThis.localStorage;
  const originalDispatch = window.dispatchEvent;
  let storage;

  beforeEach(() => {
    storage = buildStorage();
    globalThis.localStorage = storage;
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    globalThis.localStorage = originalStorage;
    window.dispatchEvent = originalDispatch;
    vi.restoreAllMocks();
  });

  it('makeTeamFollowKey trims and normalizes inputs', () => {
    expect(makeTeamFollowKey(' U12 ', ' Team A ')).toBe('U12:Team A');
    expect(makeTeamFollowKey(null, undefined)).toBe(':');
  });

  it('readFollows returns empty set when storage missing', () => {
    const result = readFollows();
    expect(result.size).toBe(0);
  });

  it('readFollows handles invalid JSON', () => {
    storage.getItem.mockReturnValueOnce('not-json');
    const result = readFollows();
    expect(result.size).toBe(0);
  });

  it('readFollows ignores non-array JSON', () => {
    storage.getItem.mockReturnValueOnce(JSON.stringify({ foo: 'bar' }));
    const result = readFollows();
    expect(result.size).toBe(0);
  });

  it('readFollows returns set for array JSON', () => {
    storage.getItem.mockReturnValueOnce(JSON.stringify(['a', 'b', 'a']));
    const result = readFollows();
    expect(result.size).toBe(2);
    expect(result.has('a')).toBe(true);
  });

  it('isFollowing checks current storage set', () => {
    storage.getItem.mockReturnValueOnce(JSON.stringify(['u12:Team A']));
    expect(isFollowing('u12:Team A')).toBe(true);
    storage.getItem.mockReturnValueOnce(JSON.stringify(['u12:Team A']));
    expect(isFollowing('u12:Team B')).toBe(false);
  });

  it('toggleFollow adds and removes entries with persistence', () => {
    storage.getItem.mockReturnValueOnce(JSON.stringify([]));
    const added = toggleFollow('u12:Team A');
    expect(added).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      'hj_followed_teams_v2',
      JSON.stringify(['u12:Team A'])
    );
    expect(window.dispatchEvent).toHaveBeenCalled();

    storage.getItem.mockReturnValueOnce(JSON.stringify(['u12:Team A']));
    const removed = toggleFollow('u12:Team A');
    expect(removed).toBe(false);
    expect(storage.setItem).toHaveBeenCalledWith(
      'hj_followed_teams_v2',
      JSON.stringify([])
    );
  });

  it('clearFollows persists an empty set and dispatches event', () => {
    clearFollows();
    expect(storage.setItem).toHaveBeenCalledWith('hj_followed_teams_v2', JSON.stringify([]));
    expect(window.dispatchEvent).toHaveBeenCalled();
  });

  it('table-driven: readFollows handles mixed raw inputs', () => {
    const cases = [
      { raw: null, size: 0 },
      { raw: JSON.stringify([]), size: 0 },
      { raw: JSON.stringify(['x']), size: 1 },
      { raw: JSON.stringify('nope'), size: 0 },
    ];

    cases.forEach(({ raw, size }) => {
      storage.getItem.mockReturnValueOnce(raw);
      const result = readFollows();
      expect(result.size).toBe(size);
    });
  });
});
