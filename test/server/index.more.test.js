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

const envSnapshot = new Map();
const setEnv = (overrides) => {
  Object.entries(overrides).forEach(([key, value]) => {
    if (!envSnapshot.has(key)) envSnapshot.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
};
const restoreEnv = () => {
  for (const [key, value] of envSnapshot.entries()) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  envSnapshot.clear();
};

const loadServer = async (overrides = {}) => {
  vi.resetModules();
  setEnv(overrides);
  return import('../../server/index.mjs');
};

const originalFetch = global.fetch;

afterEach(() => {
  mocks.query.mockReset();
  vi.restoreAllMocks();
  restoreEnv();
  if (global.fetch !== originalFetch) global.fetch = originalFetch;
});

describe('server/index.mjs additional coverage', () => {
  it('sendJson returns 304 when ETag matches', async () => {
    const { sendJson } = await loadServer({ PROVIDER_MODE: 'db', DATABASE_URL: 'postgres://fake' });
    const res1 = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };
    const req1 = { headers: {} };

    sendJson(req1, res1, 200, { ok: true }, { cache: { maxAge: 10, swr: 20 } });

    const etagCall = res1.setHeader.mock.calls.find(([key]) => key === 'ETag');
    expect(etagCall).toBeTruthy();
    const etag = etagCall[1];

    const res2 = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };
    const req2 = { headers: { 'if-none-match': etag } };
    sendJson(req2, res2, 200, { ok: true }, { cache: { maxAge: 10, swr: 20 } });

    expect(res2.writeHead).toHaveBeenCalledWith(304);
  });

  it('checkRateLimit resets window after expiry', async () => {
    const { checkRateLimit, rateLimitStore, RATE_LIMIT_MAX } = await loadServer({
      PROVIDER_MODE: 'db',
      DATABASE_URL: 'postgres://fake',
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-07T00:00:00Z'));

    rateLimitStore.clear();
    const first = checkRateLimit('10.0.0.1');
    expect(first.remaining).toBe(RATE_LIMIT_MAX - 1);

    vi.setSystemTime(new Date('2026-02-07T00:02:00Z'));
    const second = checkRateLimit('10.0.0.1');
    expect(second.remaining).toBe(RATE_LIMIT_MAX - 1);

    vi.useRealTimers();
  });

  it('apps provider groups uses apps script fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true, groups: [] }),
      text: vi.fn().mockResolvedValue(''),
    });

    const { requestHandler } = await loadServer({
      PROVIDER_MODE: 'apps',
      APPS_SCRIPT_BASE_URL: 'https://example.com/apps',
    });

    const req = {
      method: 'GET',
      url: '/api?groups=1',
      headers: { host: 'localhost' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/apps?groups=1',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
    expect(res.writeHead).toHaveBeenCalledWith(200);
  });

  it('apps provider returns 500 when APPS_SCRIPT_BASE_URL is missing', async () => {
    const { requestHandler } = await loadServer({
      PROVIDER_MODE: 'apps',
      APPS_SCRIPT_BASE_URL: '',
    });

    const req = {
      method: 'GET',
      url: '/api?groups=1',
      headers: { host: 'localhost' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(500);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.error).toBe('Missing APPS_SCRIPT_BASE_URL for apps mode');
  });

  it('apps provider handles upstream non-JSON response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
      text: vi.fn().mockResolvedValue('not-json'),
    });

    const { requestHandler } = await loadServer({
      PROVIDER_MODE: 'apps',
      APPS_SCRIPT_BASE_URL: 'https://example.com/apps',
    });

    const req = {
      method: 'GET',
      url: '/api?sheet=Fixtures&age=U12',
      headers: { host: 'localhost' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Upstream non-JSON response');
  });

  it('apps provider returns 501 for db-only endpoints', async () => {
    const { requestHandler } = await loadServer({
      PROVIDER_MODE: 'apps',
      APPS_SCRIPT_BASE_URL: 'https://example.com/apps',
    });

    const req = {
      method: 'GET',
      url: '/api/announcements',
      headers: { host: 'localhost' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(501);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.error).toBe('Not implemented for Apps Script provider');
  });

  it('requestHandler returns 500 for malformed query strings', async () => {
    const { requestHandler } = await loadServer({
      PROVIDER_MODE: 'db',
      DATABASE_URL: 'postgres://fake',
    });

    const req = {
      method: 'GET',
      url: '/api?bad=%',
      headers: { host: 'localhost' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(400);
  });

  it('returns cached standings payload when available', async () => {
    const { requestHandler, standingsCache, getStandingsCacheKey } = await loadServer({
      PROVIDER_MODE: 'db',
      DATABASE_URL: 'postgres://fake',
    });

    const cacheKey = getStandingsCacheKey('Standings', 'U10', 'hj-indoor-allstars-2025');
    standingsCache.set(cacheKey, {
      expiresAt: Date.now() + 60000,
      payload: { rows: [] },
    });

    const req = {
      method: 'GET',
      url: '/api?sheet=Standings&age=U10',
      headers: { host: 'localhost' },
      on: vi.fn(),
    };
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    await requestHandler(req, res);

    expect(mocks.query).not.toHaveBeenCalled();
    expect(res.writeHead).toHaveBeenCalledWith(200);
  });
});
