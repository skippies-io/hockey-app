import { describe, it, expect, vi } from 'vitest';
import * as server from '../../server/index.mjs';

describe('server utility functions', () => {
  it('getClientIp returns correct IP from x-forwarded-for', () => {
    const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: { remoteAddress: '9.9.9.9' } };
    expect(server.getClientIp(req)).toBe('1.2.3.4');
  });
  it('getClientIp falls back to socket.remoteAddress', () => {
    const req = { headers: {}, socket: { remoteAddress: '::ffff:127.0.0.1' } };
    expect(server.getClientIp(req)).toBe('127.0.0.1');
  });
  it('getClientIp returns unknown if no info', () => {
    const req = { headers: {}, socket: {} };
    expect(server.getClientIp(req)).toBe('unknown');
  });

  it('checkRateLimit allows first request', () => {
    const ip = '1.2.3.4';
    server.rateLimitStore.clear();
    const result = server.checkRateLimit(ip);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(server.RATE_LIMIT_MAX - 1);
  });

  it('checkRateLimit blocks after max', () => {
    const ip = '2.2.2.2';
    server.rateLimitStore.clear();
    for (let i = 0; i < server.RATE_LIMIT_MAX; i++) server.checkRateLimit(ip);
    const result = server.checkRateLimit(ip);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('setCacheHeaders sets no-store if requested', () => {
    const res = { setHeader: vi.fn() };
    server.setCacheHeaders(res, { noStore: true });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('setCacheHeaders sets cache-control for maxAge/swr', () => {
    const res = { setHeader: vi.fn() };
    server.setCacheHeaders(res, { maxAge: 10, swr: 20 });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=10, stale-while-revalidate=20');
  });

  it('getFixturesCacheKey and getStandingsCacheKey are deterministic', () => {
    expect(server.getFixturesCacheKey('Fixtures', 'u12', 'tid')).toBe('Fixtures:u12:db:tid');
    expect(server.getStandingsCacheKey('Standings', 'u12', 'tid')).toBe('Standings:u12:db:tid');
  });

  it('getCachedFixtures returns null if expired', () => {
    const key = 'k';
    server.fixturesCache.set(key, { expiresAt: Date.now() - 1000, payload: { foo: 1 } });
    expect(server.getCachedFixtures(key)).toBeNull();
  });
  it('getCachedFixtures returns payload if valid', () => {
    const key = 'k2';
    server.fixturesCache.set(key, { expiresAt: Date.now() + 10000, payload: { foo: 2 } });
    expect(server.getCachedFixtures(key)).toEqual({ foo: 2 });
  });
});
