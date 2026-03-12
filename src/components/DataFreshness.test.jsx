import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const getMetaMock = vi.fn();
const getCachedLastSyncAtMock = vi.fn();

vi.mock('../lib/api', () => ({
  getMeta: (...args) => getMetaMock(...args),
  getCachedLastSyncAt: () => getCachedLastSyncAtMock(),
}));

describe('DataFreshness', () => {
  beforeEach(() => {
    getMetaMock.mockReset();
    getCachedLastSyncAtMock.mockReset();
  });

  it('renders nothing when no cached value and fetch fails', async () => {
    getCachedLastSyncAtMock.mockReturnValue('');
    getMetaMock.mockRejectedValueOnce(new Error('nope'));

    const { default: DataFreshness } = await import('./DataFreshness');
    render(<DataFreshness />);

    // allow effect to run
    await waitFor(() => {
      expect(getMetaMock).toHaveBeenCalled();
    });

    expect(screen.queryByLabelText('Data freshness')).toBeNull();
  });

  it('renders using cached value', async () => {
    getCachedLastSyncAtMock.mockReturnValue(new Date(Date.now() - 2 * 60_000).toISOString());
    getMetaMock.mockResolvedValueOnce({ ok: true, last_sync_at: new Date().toISOString() });

    const { default: DataFreshness } = await import('./DataFreshness');
    render(<DataFreshness />);

    expect(await screen.findByLabelText('Data freshness')).toBeDefined();
  });

  it('marks data as stale when older than threshold', async () => {
    // 16 minutes ago (stale threshold is 15min)
    getCachedLastSyncAtMock.mockReturnValue(new Date(Date.now() - 16 * 60_000).toISOString());
    getMetaMock.mockRejectedValueOnce(new Error('offline'));

    const { default: DataFreshness } = await import('./DataFreshness');
    render(<DataFreshness />);

    const node = await screen.findByLabelText('Data freshness');
    expect(node.textContent).toMatch(/stale/i);
  });
});
