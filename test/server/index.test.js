import { describe, it, expect, vi } from 'vitest';
import {
  getClientIp,
  rateLimitStore,
  RATE_LIMIT_MAX,
  checkRateLimit,
  setCacheHeaders,
  getFixturesCacheKey,
  getStandingsCacheKey,
  fixturesCache,
  getCachedFixtures,
  sendJson,
  applyCors,
  requestHandler
} from '../../server/index.mjs';

describe('server utility functions', () => {
  it('getClientIp returns correct IP from x-forwarded-for', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: { remoteAddress: '9.9.9.9' } };
    expect(getClientIp(req)).toBe('1.2.3.4');
  });
  it('getClientIp falls back to socket.remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '::ffff:127.0.0.1' } };
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
  it('getClientIp returns unknown if no info', () => {
    const req = { headers: {}, socket: {} };
    expect(getClientIp(req)).toBe('unknown');
  });

  it('checkRateLimit allows first request', () => {
    const ip = '1.2.3.4';
    rateLimitStore.clear();
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_MAX - 1);
  });

  it('checkRateLimit blocks after max', () => {
    const ip = '2.2.2.2';
    rateLimitStore.clear();
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(ip);
    const result = checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('setCacheHeaders sets no-store if requested', () => {
    const res = { setHeader: vi.fn() };
    setCacheHeaders(res, { noStore: true });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('setCacheHeaders sets cache-control for maxAge/swr', () => {
    const res = { setHeader: vi.fn() };
    setCacheHeaders(res, { maxAge: 10, swr: 20 });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
  });

  it('getFixturesCacheKey and getStandingsCacheKey are deterministic', () => {
    expect(getFixturesCacheKey('Fixtures', 'u12', 'tid')).toBe('Fixtures:u12:db:tid');
    expect(getStandingsCacheKey('Standings', 'u12', 'tid')).toBe('Standings:u12:db:tid');
  });

  it('getCachedFixtures returns null if expired', () => {
    const key = 'k';
    fixturesCache.set(key, { expiresAt: Date.now() - 1000, payload: { foo: 1 } });
    expect(getCachedFixtures(key)).toBeNull();
  });
  it('getCachedFixtures returns payload if valid', () => {
    const key = 'k2';
    fixturesCache.set(key, { expiresAt: Date.now() + 10000, payload: { foo: 2 } });
    expect(getCachedFixtures(key)).toEqual({ foo: 2 });
  });

  it('sendJson correctly sends payload and headers', () => {
    const res = {
      setHeader: vi.fn(),
      writeHead: vi.fn(),
      end: vi.fn()
    };
    sendJson({}, res, 200, { ok: true });
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('application/json'));
    expect(res.writeHead).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
  });

  it('applyCors sets headers for allowed origins', () => {
    const req = { headers: { origin: 'http://localhost:5173' } };
    const res = { setHeader: vi.fn() };
    applyCors(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');

    const reqGh = { headers: { origin: 'https://skippies-io.github.io' } };
    const resGh = { setHeader: vi.fn() };
    applyCors(reqGh, resGh);
    expect(resGh.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://skippies-io.github.io');
  });

  it('sendJson handles HEAD and cache', () => {
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };
    // Test early return for HEAD requests
    sendJson({}, res, 200, { ok: true }, { head: true });
    expect(res.writeHead).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalledWith(expect.any(String));
  });

  it('requestHandler handles public paths', async () => {
    const res = { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };

    // Announcements
    const reqAnn = { method: 'GET', url: '/api/announcements', headers: { host: 'localhost' }, on: vi.fn() };
    await requestHandler(reqAnn, res);
    expect(res.writeHead).toHaveBeenCalled();

    // Version
    const reqVer = { method: 'GET', url: '/version', headers: { host: 'localhost' }, on: vi.fn() };
    await requestHandler(reqVer, res);
    expect(res.writeHead).toHaveBeenCalledWith(200);
  });

});
