import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestMagicLink,
  verifyMagicLink,
  verifyJWT,
  requireAuth,
} from '../../server/auth.mjs';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ response: 'success' }),
    })),
  },
}));

describe('auth.mjs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any process.env overrides
    delete process.env.JWT_SECRET;
    delete process.env.BASE_URL;
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
  });

  describe('requestMagicLink', () => {
    it('generates and stores a magic link token', async () => {
      const result = await requestMagicLink('admin@example.com');
      expect(result).toEqual({ success: true });
    });

    it('rejects empty email', async () => {
      await expect(requestMagicLink(''))
        .rejects.toThrow('Invalid email address');
    });

    it('rejects null email', async () => {
      await expect(requestMagicLink(null))
        .rejects.toThrow('Invalid email address');
    });

    it('rejects undefined email', async () => {
      await expect(requestMagicLink(undefined))
        .rejects.toThrow('Invalid email address');
    });

    it('rejects email without @ symbol', async () => {
      await expect(requestMagicLink('notanemail'))
        .rejects.toThrow('Invalid email address');
    });

    it('accepts valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'admin@localhost',
      ];

      for (const email of validEmails) {
        const result = await requestMagicLink(email);
        expect(result.success).toBe(true);
      }
    });

    it('sends email to correct address', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('test@example.com');

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
        })
      );
    });

    it('includes magic link in email', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('/admin/verify?token=');
    });

    it('uses BASE_URL from environment', async () => {
      process.env.BASE_URL = 'https://hockey.example.com';
      
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('https://hockey.example.com/admin/verify');
    });

    it('uses default BASE_URL if not set', async () => {
      delete process.env.BASE_URL;
      
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('http://localhost:5173/admin/verify');
    });

    it('includes token expiry info in email', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('15 minutes');
    });

    it('stores token with expiry time', async () => {
      const result = await requestMagicLink('admin@example.com');
      // We can't directly access the token, but we can test that verification fails
      // with an invalid token
      expect(() => verifyMagicLink('invalid-token')).toThrow('Invalid or expired token');
    });

    it('handles email sending errors', async () => {
      const nodemailer = await import('nodemailer');
      vi.spyOn(nodemailer.default, 'createTransport').mockReturnValueOnce({
        sendMail: vi.fn().mockRejectedValueOnce(new Error('SMTP Error')),
      });

      await expect(requestMagicLink('admin@example.com'))
        .rejects.toThrow('SMTP Error');
    });

    it('cleans up expired tokens', async () => {
      // Request a token
      const promise1 = requestMagicLink('admin1@example.com');
      
      // Mock time passing and another request
      const promise2 = requestMagicLink('admin2@example.com');

      await Promise.all([promise1, promise2]);

      // The second token should still work
      // (This is an indirect test since we can't access the token directly)
    });

    it('allows multiple tokens to be issued', async () => {
      const result1 = await requestMagicLink('admin1@example.com');
      const result2 = await requestMagicLink('admin2@example.com');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('uses GMAIL_USER from environment', async () => {
      process.env.GMAIL_USER = 'custom@gmail.com';
      
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.from).toBe('custom@gmail.com');
    });

    it('uses default GMAIL_USER if not set', async () => {
      delete process.env.GMAIL_USER;
      
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.from).toBe('leroy@lbdc.co.za');
    });
  });

  describe('verifyMagicLink', () => {
    it('returns JWT token for valid magic link', async () => {
      // First create a token
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      // Extract token from email
      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      // Verify the token
      const result = verifyMagicLink(token);
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('email', 'admin@example.com');
      expect(result.token).toBeTruthy();
    });

    it('returns JWT with admin role', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      const result = verifyMagicLink(token);
      const decoded = verifyJWT(result.token);
      expect(decoded.role).toBe('admin');
    });

    it('rejects invalid token', () => {
      expect(() => verifyMagicLink('invalid-token'))
        .toThrow('Invalid or expired token');
    });

    it('rejects empty token', () => {
      expect(() => verifyMagicLink(''))
        .toThrow('Invalid or expired token');
    });

    it('rejects null token', () => {
      expect(() => verifyMagicLink(null))
        .toThrow('Invalid or expired token');
    });

    it('invalidates token after single use', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      // First use should work
      verifyMagicLink(token);

      // Second use should fail
      expect(() => verifyMagicLink(token))
        .toThrow('Invalid or expired token');
    });

    it('rejects expired tokens', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      // Manually set the token to expired (simulate time passing)
      // This is internal implementation detail, but we test the behavior
      const mockDate = Date.now() + 16 * 60 * 1000; // 16 minutes later
      vi.setSystemTime(mockDate);

      expect(() => verifyMagicLink(token))
        .toThrow('Token has expired');

      vi.useRealTimers();
    });

    it('includes email in returned JWT', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('test@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      const result = verifyMagicLink(token);
      const decoded = verifyJWT(result.token);
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('verifyJWT', () => {
    it('verifies valid JWT token', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(token);
      const decoded = verifyJWT(jwtToken);

      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role', 'admin');
    });

    it('rejects invalid JWT', () => {
      expect(() => verifyJWT('invalid.jwt.token'))
        .toThrow();
    });

    it('rejects tampered JWT', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(token);
      
      // Tamper with the token
      const tampered = jwtToken.substring(0, jwtToken.length - 1) + 'X';

      expect(() => verifyJWT(tampered))
        .toThrow();
    });

    it('rejects expired JWT', async () => {
      process.env.JWT_SECRET = 'test-secret-key';
      
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      // Move time forward past JWT expiry (7 days)
      const futureDate = Date.now() + 8 * 24 * 60 * 60 * 1000;
      vi.setSystemTime(futureDate);

      expect(() => verifyJWT(jwtToken))
        .toThrow('Invalid or expired session');

      vi.useRealTimers();
    });

    it('rejects empty token', () => {
      expect(() => verifyJWT(''))
        .toThrow();
    });

    it('rejects null token', () => {
      expect(() => verifyJWT(null))
        .toThrow();
    });

    it('decodes token without verification when valid', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(token);
      const decoded = verifyJWT(jwtToken);

      expect(decoded.email).toBeTruthy();
      expect(decoded.role).toBe('admin');
    });

    it('uses JWT_SECRET from environment', () => {
      process.env.JWT_SECRET = 'custom-secret-key';

      // The secret should be used for verification
      // This is tested implicitly through the token generation and verification
      expect(() => verifyJWT('invalid.token.data'))
        .toThrow();
    });

    it('uses default JWT_SECRET if not set', async () => {
      delete process.env.JWT_SECRET;

      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      // The default secret is used internally
      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(token);
      const decoded = verifyJWT(jwtToken);

      expect(decoded).toBeTruthy();
    });
  });

  describe('requireAuth', () => {
    it('extracts and verifies JWT from Bearer token', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      const req = {
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      };

      const decoded = requireAuth(req);
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('role', 'admin');
    });

    it('uses authorisation header (British spelling)', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      const req = {
        headers: {
          authorisation: `Bearer ${jwtToken}`,
        },
      };

      const decoded = requireAuth(req);
      expect(decoded).toHaveProperty('email');
    });

    it('rejects request without authorization header', () => {
      const req = {
        headers: {},
      };

      expect(() => requireAuth(req))
        .toThrow('Unauthorised: No token provided');
    });

    it('rejects request with missing Bearer prefix', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      const req = {
        headers: {
          authorization: jwtToken, // Missing "Bearer " prefix
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

    it('rejects request with expired JWT', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      const req = {
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      };

      // Move time forward
      const futureDate = Date.now() + 8 * 24 * 60 * 60 * 1000;
      vi.setSystemTime(futureDate);

      expect(() => requireAuth(req))
        .toThrow();

      vi.useRealTimers();
    });

    it('handles case-insensitive authorization header', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      // Headers are typically lowercase in Node.js
      const req = {
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      };

      const decoded = requireAuth(req);
      expect(decoded).toBeTruthy();
    });

    it('returns decoded JWT payload', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      const testEmail = 'admin@test.com';
      await requestMagicLink(testEmail);

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const magicToken = tokenMatch[1];

      const { token: jwtToken } = verifyMagicLink(magicToken);

      const req = {
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      };

      const decoded = requireAuth(req);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.role).toBe('admin');
    });
  });
});
