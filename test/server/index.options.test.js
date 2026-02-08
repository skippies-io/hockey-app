import { describe, it, expect, vi, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('pg', () => {
  const Pool = class {
    constructor() {
      this.query = mocks.query;
      this.connect = vi.fn();
      this.on = vi.fn();
    }
  };
  return { Pool };
});

const loadServer = async () => {
  vi.resetModules();
  process.env.VITEST = '1';
  return import('../../server/index.mjs');
};

afterEach(() => {
  mocks.query.mockReset();
  vi.restoreAllMocks();
});

describe('requestHandler OPTIONS handling', () => {
  it('returns 204 for admin announcements preflight', async () => {
    const { requestHandler } = await loadServer();
    const req = {
      method: 'OPTIONS',
      url: '/api/admin/announcements',
      headers: { host: 'localhost', origin: 'http://localhost:5173' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
    expect(res.writeHead).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('returns 204 for admin preflight routes', async () => {
    const { requestHandler } = await loadServer();
    const req = {
      method: 'OPTIONS',
      url: '/api/admin/users',
      headers: { host: 'localhost', origin: 'http://localhost:5173' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
    expect(res.writeHead).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });
});
