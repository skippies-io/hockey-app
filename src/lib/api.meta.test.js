/* eslint-env node */
/* global process */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need a stable API_BASE and to mock fetch.
vi.stubGlobal('fetch', vi.fn());

describe('api meta helpers', () => {
  beforeEach(() => {
    fetch.mockReset();
    localStorage.clear();
  });

  it('getMeta caches last_sync_at in localStorage', async () => {
    // dynamic import so API_BASE is evaluated with env
    process.env.VITE_API_BASE = 'http://localhost:8787/api';

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, last_sync_at: '2026-03-12T00:00:00.000Z' }),
      headers: { get: () => null },
    });

    const { getMeta, getCachedLastSyncAt } = await import('./api.js');

    const meta = await getMeta();
    expect(meta.ok).toBe(true);
    expect(getCachedLastSyncAt()).toContain('2026-03-12');
  });
});
