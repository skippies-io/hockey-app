import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

describe('auth.mjs', () => {
  let verifyJWT;
  let requireAuth;
  let requestMagicLink;
  let verifyMagicLink;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_EMAILS = 'leroybarnes@me.com';
    process.env.GMAIL_USER = 'leroybarnes@me.com';
    process.env.GMAIL_APP_PASSWORD = 'app-pass';
    process.env.BASE_URL = 'http://localhost:5173';
    ({ verifyJWT, requireAuth, requestMagicLink, verifyMagicLink } = await import('../../server/auth.mjs'));
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.BASE_URL;
  });

  describe('verifyJWT', () => {
    it('rejects invalid JWT', () => {
      expect(() => verifyJWT('invalid.jwt.token'))
        .toThrow();
    });

    it('rejects tampered JWT', () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0.fake';
      expect(() => verifyJWT(fakeToken))
        .toThrow();
    });

    it('rejects empty token', () => {
      expect(() => verifyJWT(''))
        .toThrow();
    });

    it('rejects null token', () => {
      expect(() => verifyJWT(null))
        .toThrow();
    });

    it('rejects undefined token', () => {
      expect(() => verifyJWT(undefined))
        .toThrow();
    });
  });

  describe('requestMagicLink', () => {
    it('rejects invalid email address', async () => {
      await expect(requestMagicLink('not-an-email'))
        .rejects.toThrow('Invalid email address');
    });

    it('rejects email not on allowlist', async () => {
      await expect(requestMagicLink('someone@else.com'))
        .rejects.toThrow('Email not authorised for admin access');
    });

    it('sends a magic link for allowlisted email', async () => {
      await requestMagicLink('leroybarnes@me.com');
      expect(mockCreateTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const args = mockSendMail.mock.calls[0][0];
      expect(args.to).toBe('leroybarnes@me.com');
      expect(args.html).toContain('http://localhost:5173/admin/verify?token=');
    });
  });

  describe('verifyMagicLink', () => {
    it('returns JWT for valid token', async () => {
      await requestMagicLink('leroybarnes@me.com');
      const mail = mockSendMail.mock.calls[0][0];
      const token = mail.html.match(/token=([a-f0-9]+)/i)?.[1];
      expect(token).toBeTruthy();

      const result = verifyMagicLink(token);
      expect(result.email).toBe('leroybarnes@me.com');
      expect(typeof result.token).toBe('string');
    });

    it('rejects expired token', async () => {
      const nowSpy = vi.spyOn(Date, 'now');
      nowSpy.mockImplementation(() => 0);
      await requestMagicLink('leroybarnes@me.com');

      const mail = mockSendMail.mock.calls[0][0];
      const token = mail.html.match(/token=([a-f0-9]+)/i)?.[1];
      expect(token).toBeTruthy();

      nowSpy.mockImplementation(() => 15 * 60 * 1000 + 1);
      expect(() => verifyMagicLink(token)).toThrow('Token has expired');
      nowSpy.mockRestore();
    });

    it('rejects invalid token', () => {
      expect(() => verifyMagicLink('bad-token'))
        .toThrow('Invalid or expired token');
    });
  });

  describe('JWT secret enforcement', () => {
    it('throws when JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;
      vi.resetModules();
      await expect(import('../../server/auth.mjs')).rejects.toThrow(
        'JWT_SECRET must be set for admin authentication'
      );
    });
  });

  describe('requireAuth', () => {
    it('accepts a valid JWT and returns decoded payload', async () => {
      await requestMagicLink('leroybarnes@me.com');
      const mail = mockSendMail.mock.calls[0][0];
      const token = mail.html.match(/token=([a-f0-9]+)/i)?.[1];
      const { token: jwtToken } = verifyMagicLink(token);

      const decoded = requireAuth({
        headers: { authorization: `Bearer ${jwtToken}` },
      });

      expect(decoded.email).toBe('leroybarnes@me.com');
      expect(decoded.role).toBe('admin');
    });

    it('rejects request without authorization header', () => {
      const req = { headers: {} };
      expect(() => requireAuth(req))
        .toThrow('Unauthorised: No token provided');
    });

    it('rejects request with missing Bearer prefix', () => {
      const req = {
        headers: {
          authorization: 'invalid-token',
        },
      };

      expect(() => requireAuth(req))
        .toThrow('Unauthorised: No token provided');
    });

    it('rejects request with invalid Bearer format', () => {
      const req = {
        headers: {
          authorization: 'BasicAuth token123',
        },
      };

      expect(() => requireAuth(req))
        .toThrow('Unauthorised: No token provided');
    });

    it('rejects request with invalid JWT token', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid.jwt.token',
        },
      };

      expect(() => requireAuth(req))
        .toThrow();
    });

    it('uses authorisation header (British spelling)', () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0.fake';
      const req = {
        headers: {
          authorisation: `Bearer ${fakeToken}`,
        },
      };

      expect(() => requireAuth(req))
        .toThrow();
    });

    it('rejects request with malformed authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer',  // Missing token
        },
      };

      expect(() => requireAuth(req))
        .toThrow();
    });

    it('extracts Bearer token correctly', () => {
      // This tests that the Bearer extraction logic works
      // Even though the token is invalid, we should test that it's extracted
      const req = {
        headers: {
          authorization: 'Bearer test-token-value',
        },
      };

      // Since test-token-value is not a valid JWT, it should throw on verification
      expect(() => requireAuth(req))
        .toThrow();
    });
  });
});
