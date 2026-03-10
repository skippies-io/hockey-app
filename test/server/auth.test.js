import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Unit tests for server/auth.mjs
// ---------------------------------------------------------------------------
import {
  ADMIN_ALLOWLIST,
  isAllowedEmail,
  generateToken,
  hashToken,
  issueMagicToken,
  verifyMagicToken,
  issueSession,
  verifySession,
} from '../../server/auth.mjs';

describe('auth helpers', () => {
  it('ADMIN_ALLOWLIST includes the default address', () => {
    expect(ADMIN_ALLOWLIST).toContain('leroybarnes@me.com');
  });

  it('isAllowedEmail returns true for an allowed address (case-insensitive)', () => {
    expect(isAllowedEmail('LeroyBarnes@me.com')).toBe(true);
  });

  it('isAllowedEmail returns false for an unknown address', () => {
    expect(isAllowedEmail('hacker@evil.com')).toBe(false);
  });

  it('isAllowedEmail returns false for empty/null input', () => {
    expect(isAllowedEmail('')).toBe(false);
    expect(isAllowedEmail(null)).toBe(false);
  });

  it('generateToken returns a 64-character hex string', () => {
    const token = generateToken();
    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('generateToken produces unique values', () => {
    expect(generateToken()).not.toBe(generateToken());
  });

  it('hashToken is deterministic', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('hashToken produces a 64-character hex string', () => {
    const h = hashToken('test-token');
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('hashToken produces different output for different inputs', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});

// ---------------------------------------------------------------------------
// DB-backed functions — use a mock pool
// ---------------------------------------------------------------------------

function makePool(rows = []) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) };
}

describe('issueMagicToken', () => {
  it('inserts a hashed token and returns the raw token + expiry', async () => {
    const pool = makePool();
    const { token, expiresAt } = await issueMagicToken(pool, 'leroybarnes@me.com');

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(pool.query).toHaveBeenCalledOnce();
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO admin_magic_token/);
    // Stored value must NOT be the raw token
    expect(params[0]).not.toBe(token);
    expect(params[1]).toBe('leroybarnes@me.com');
  });
});

describe('verifyMagicToken', () => {
  it('returns the email when the token matches', async () => {
    const pool = makePool([{ email: 'leroybarnes@me.com' }]);
    const email = await verifyMagicToken(pool, 'some-valid-token');
    expect(email).toBe('leroybarnes@me.com');
  });

  it('returns null when the DB finds no matching/valid token', async () => {
    const pool = makePool([]); // zero rows → invalid/expired/used
    const email = await verifyMagicToken(pool, 'bad-token');
    expect(email).toBeNull();
  });

  it('returns null for a falsy token without hitting the DB', async () => {
    const pool = makePool();
    expect(await verifyMagicToken(pool, '')).toBeNull();
    expect(await verifyMagicToken(pool, null)).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('uses UPDATE...WHERE used_at IS NULL to enforce single-use', async () => {
    const pool = makePool([{ email: 'leroybarnes@me.com' }]);
    await verifyMagicToken(pool, 'tok');
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toMatch(/used_at IS NULL/);
    expect(sql).toMatch(/SET used_at = NOW\(\)/);
  });
});

describe('issueSession', () => {
  it('inserts a hashed session token and returns the raw token + expiry', async () => {
    const pool = makePool();
    const { token, expiresAt } = await issueSession(pool, 'leroybarnes@me.com');

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    expect(pool.query).toHaveBeenCalledOnce();
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO admin_session/);
    expect(params[0]).not.toBe(token); // hash stored, not raw
    expect(params[1]).toBe('leroybarnes@me.com');
  });
});

describe('verifySession', () => {
  it('returns the email for a valid session', async () => {
    const pool = makePool([{ email: 'leroybarnes@me.com' }]);
    const email = await verifySession(pool, 'valid-session-token');
    expect(email).toBe('leroybarnes@me.com');
  });

  it('returns null when no session found (expired or invalid)', async () => {
    const pool = makePool([]);
    expect(await verifySession(pool, 'stale-token')).toBeNull();
  });

  it('returns null when token is falsy', async () => {
    const pool = makePool();
    expect(await verifySession(pool, '')).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns null when pool is null', async () => {
    expect(await verifySession(null, 'any-token')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// HTTP route handlers
// ---------------------------------------------------------------------------

import { handleMagicLinkRequest, handleVerifyRequest } from '../../server/auth-routes.mjs';

function makeReqRes(method = 'POST', bodyObj = {}) {
  const bodyStr = JSON.stringify(bodyObj);
  const req = {
    method,
    on: vi.fn((event, cb) => {
      if (event === 'data') cb(bodyStr);
      if (event === 'end') cb();
    }),
  };
  const res = {};
  const sendJson = vi.fn();
  return { req, res, sendJson };
}

describe('handleMagicLinkRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 501 when pool is null', async () => {
    const { req, res, sendJson } = makeReqRes('POST', { email: 'leroybarnes@me.com' });
    await handleMagicLinkRequest(req, res, { pool: null, sendJson });
    expect(sendJson).toHaveBeenCalledWith(req, res, 501, expect.objectContaining({ ok: false }));
  });

  it('returns 400 when email is missing', async () => {
    const { req, res, sendJson } = makeReqRes('POST', {});
    const pool = makePool();
    await handleMagicLinkRequest(req, res, { pool, sendJson });
    expect(sendJson).toHaveBeenCalledWith(req, res, 400, expect.objectContaining({ ok: false }));
  });

  it('returns 200 generic message for an allowed email', async () => {
    const pool = makePool(); // issueMagicToken insert succeeds
    const { req, res, sendJson } = makeReqRes('POST', { email: 'leroybarnes@me.com' });

    // sendMagicLink will log (no SMTP configured in tests) — no mock needed.
    await handleMagicLinkRequest(req, res, { pool, sendJson });

    expect(sendJson).toHaveBeenCalledWith(
      req, res, 200,
      expect.objectContaining({ ok: true, message: expect.any(String) })
    );
  });

  it('returns the same 200 generic message for an unknown email (no enumeration)', async () => {
    const pool = makePool();
    const { req, res, sendJson } = makeReqRes('POST', { email: 'nobody@nowhere.com' });
    await handleMagicLinkRequest(req, res, { pool, sendJson });

    expect(sendJson).toHaveBeenCalledWith(
      req, res, 200,
      expect.objectContaining({ ok: true, message: expect.any(String) })
    );
    // The DB must NOT be touched for an unknown email.
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('still returns 200 even when issueMagicToken throws', async () => {
    const pool = { query: vi.fn().mockRejectedValue(new Error('DB down')) };
    const { req, res, sendJson } = makeReqRes('POST', { email: 'leroybarnes@me.com' });
    await handleMagicLinkRequest(req, res, { pool, sendJson });
    expect(sendJson).toHaveBeenCalledWith(req, res, 200, expect.objectContaining({ ok: true }));
  });
});

describe('handleVerifyRequest', () => {
  it('returns 501 when pool is null', async () => {
    const { req, res, sendJson } = makeReqRes('POST', { token: 'tok' });
    await handleVerifyRequest(req, res, { pool: null, sendJson });
    expect(sendJson).toHaveBeenCalledWith(req, res, 501, expect.objectContaining({ ok: false }));
  });

  it('returns 400 when token is missing', async () => {
    const pool = makePool();
    const { req, res, sendJson } = makeReqRes('POST', {});
    await handleVerifyRequest(req, res, { pool, sendJson });
    expect(sendJson).toHaveBeenCalledWith(req, res, 400, expect.objectContaining({ ok: false }));
  });

  it('returns 401 when token is invalid/expired', async () => {
    // verifyMagicToken returns null → bad token
    const pool = makePool([]);
    const { req, res, sendJson } = makeReqRes('POST', { token: 'bad-token' });
    await handleVerifyRequest(req, res, { pool, sendJson });
    expect(sendJson).toHaveBeenCalledWith(req, res, 401, expect.objectContaining({ ok: false }));
  });

  it('returns 200 with a session token on success', async () => {
    // First query = verifyMagicToken (returns email), second = issueSession (insert, no rows needed)
    const pool = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ email: 'leroybarnes@me.com' }] }) // verify
        .mockResolvedValueOnce({ rows: [] }),                                 // issue session
    };
    const { req, res, sendJson } = makeReqRes('POST', { token: 'valid-magic-token' });
    await handleVerifyRequest(req, res, { pool, sendJson });

    expect(sendJson).toHaveBeenCalledWith(
      req, res, 200,
      expect.objectContaining({
        ok: true,
        token: expect.any(String),
        expiresAt: expect.any(String),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Integration: session guard on /api/admin/* via requestHandler
// ---------------------------------------------------------------------------

const pgMocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock('pg', () => {
  const Pool = class {
    constructor() {
      this.query = pgMocks.query;
      this.connect = vi.fn();
      this.on = vi.fn();
    }
  };
  return { Pool };
});

vi.mock('../../server/admin.mjs', () => ({
  handleAdminRequest: vi.fn(async (_req, res) => {
    res.writeHead(200);
    res.end('{"ok":true}');
  }),
}));

vi.mock('../../server/mailer.mjs', () => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
}));

process.env.PROVIDER_MODE = 'db';
process.env.DATABASE_URL = 'postgres://fake';

import { requestHandler } from '../../server/index.mjs';

function makeHttpReq(method, url, headers = {}, bodyObj = null) {
  const bodyStr = bodyObj ? JSON.stringify(bodyObj) : '';
  return {
    method,
    url,
    headers: { host: 'localhost', ...headers },
    socket: { remoteAddress: '127.0.0.1' },
    on: vi.fn((event, cb) => {
      if (event === 'data' && bodyStr) cb(bodyStr);
      if (event === 'end') cb();
    }),
  };
}

function makeHttpRes() {
  return { setHeader: vi.fn(), writeHead: vi.fn(), end: vi.fn() };
}

describe('requestHandler — admin session guard', () => {
  beforeEach(() => {
    pgMocks.query.mockReset();
  });

  it('returns 401 when Authorization header is absent', async () => {
    // verifySession → pool.query returns no rows
    pgMocks.query.mockResolvedValue({ rows: [] });

    const req = makeHttpReq('GET', '/api/admin/announcements');
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(401);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.ok).toBe(false);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 for an invalid Bearer token', async () => {
    pgMocks.query.mockResolvedValue({ rows: [] });

    const req = makeHttpReq('GET', '/api/admin/announcements', {
      authorization: 'Bearer invalid-token',
    });
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(401);
  });

  it('passes through to handleAdminRequest with a valid Bearer token', async () => {
    // verifySession → returns an email row
    pgMocks.query.mockResolvedValue({ rows: [{ email: 'leroybarnes@me.com' }] });

    const { handleAdminRequest } = await import('../../server/admin.mjs');
    vi.mocked(handleAdminRequest).mockClear();

    const req = makeHttpReq('GET', '/api/admin/announcements', {
      authorization: 'Bearer valid-session-token',
    });
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(handleAdminRequest).toHaveBeenCalledTimes(1);
  });
});

describe('requestHandler — auth routes', () => {
  beforeEach(() => {
    pgMocks.query.mockReset();
  });

  it('POST /api/auth/magic-link returns 200 with generic message', async () => {
    // issueMagicToken INSERT
    pgMocks.query.mockResolvedValue({ rows: [] });

    const req = makeHttpReq('POST', '/api/auth/magic-link', {}, { email: 'leroybarnes@me.com' });
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/sign-in link/i);
  });

  it('POST /api/auth/magic-link returns 200 even for an unknown email', async () => {
    pgMocks.query.mockResolvedValue({ rows: [] });

    const req = makeHttpReq('POST', '/api/auth/magic-link', {}, { email: 'notinlist@example.com' });
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.ok).toBe(true);
  });

  it('POST /api/auth/verify returns 401 for an invalid token', async () => {
    pgMocks.query.mockResolvedValue({ rows: [] }); // no matching token

    const req = makeHttpReq('POST', '/api/auth/verify', {}, { token: 'bad' });
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(401);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.ok).toBe(false);
  });

  it('POST /api/auth/verify returns 200 with token on success', async () => {
    pgMocks.query
      .mockResolvedValueOnce({ rows: [{ email: 'leroybarnes@me.com' }] }) // verifyMagicToken
      .mockResolvedValueOnce({ rows: [] });                                 // issueSession

    const req = makeHttpReq('POST', '/api/auth/verify', {}, { token: 'valid-magic' });
    const res = makeHttpRes();
    await requestHandler(req, res);

    expect(res.writeHead).toHaveBeenCalledWith(200);
    const body = JSON.parse(res.end.mock.calls[0][0]);
    expect(body.ok).toBe(true);
    expect(body.token).toBeTruthy();
    expect(body.expiresAt).toBeTruthy();
  });

  it('GET /api/auth/magic-link returns 405', async () => {
    const req = makeHttpReq('GET', '/api/auth/magic-link');
    const res = makeHttpRes();
    await requestHandler(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(405);
  });
});
