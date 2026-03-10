import { describe, it, expect, vi } from 'vitest';

vi.mock('../../server/admin.mjs', () => ({
  handleAdminRequest: vi.fn(async (req, res) => {
    if (res.writeHead) res.writeHead(200);
    if (res.end) res.end();
  })
}));

// Allow all sessions so this test focuses on routing, not auth.
vi.mock('../../server/auth.mjs', () => ({
  verifySession: vi.fn().mockResolvedValue('leroybarnes@me.com'),
  ADMIN_ALLOWLIST: ['leroybarnes@me.com'],
  isAllowedEmail: vi.fn().mockReturnValue(false),
  generateToken: vi.fn().mockReturnValue('token'),
  hashToken: vi.fn().mockReturnValue('hash'),
  issueMagicToken: vi.fn(),
  issueSession: vi.fn(),
  verifyMagicToken: vi.fn(),
}));

describe('server requestHandler admin route', () => {
  it('routes /api/admin/announcements to handleAdminRequest', async () => {
    const { requestHandler } = await import('../../server/index.mjs');
    const { handleAdminRequest } = await import('../../server/admin.mjs');

    const req = {
      method: 'GET',
      url: '/api/admin/announcements',
      headers: {
        host: 'localhost',
        origin: 'https://skippies-io.github.io',
        authorization: 'Bearer valid-session-token',
      },
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
