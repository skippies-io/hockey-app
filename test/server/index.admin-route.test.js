import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../server/admin.mjs', () => ({
  handleAdminRequest: vi.fn(async (req, res) => {
    if (res.writeHead) res.writeHead(200);
    if (res.end) res.end();
  })
}));

describe('server requestHandler admin route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.unmock('../../server/admin.mjs');
  });

  it('routes /api/admin/announcements to handleAdminRequest', async () => {
    const { requestHandler } = await import('../../server/index.mjs');
    const { handleAdminRequest } = await import('../../server/admin.mjs');

    const req = {
      method: 'GET',
      url: '/api/admin/announcements',
      headers: { host: 'localhost', origin: 'https://skippies-io.github.io' },
      socket: { remoteAddress: '127.0.0.1' },
      on: vi.fn()
    };
    const res = {
      setHeader: vi.fn(),
      writeHead: vi.fn(),
      end: vi.fn()
    };

    await requestHandler(req, res);

    expect(handleAdminRequest).toHaveBeenCalledTimes(1);
    expect(res.end).toHaveBeenCalled();
  });
});
