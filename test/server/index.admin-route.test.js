import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as adminModule from '../../server/admin.mjs';

describe('server requestHandler admin route', () => {
  let handleAdminRequestSpy;

  beforeEach(() => {
    handleAdminRequestSpy = vi.spyOn(adminModule, 'handleAdminRequest').mockImplementation(
      async (req, res) => {
        if (res.writeHead) res.writeHead(200);
        if (res.end) res.end();
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('routes /api/admin/announcements to handleAdminRequest', async () => {
    const { requestHandler } = await import('../../server/index.mjs');

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

    expect(handleAdminRequestSpy).toHaveBeenCalledTimes(1);
    expect(res.end).toHaveBeenCalled();
  });
});
