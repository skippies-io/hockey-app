import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    it('rejects email without @ symbol', async () => {
      await expect(requestMagicLink('notanemail'))
        .rejects.toThrow('Invalid email address');
    });

    it('accepts valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
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

    it('includes token expiry info in email', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      expect(emailCall.html).toContain('15 minutes');
    });

    it('handles email sending errors', async () => {
      const nodemailer = await import('nodemailer');
      vi.spyOn(nodemailer.default, 'createTransport').mockReturnValueOnce({
        sendMail: vi.fn().mockRejectedValueOnce(new Error('SMTP Error')),
      });

      await expect(requestMagicLink('admin@example.com'))
        .rejects.toThrow('SMTP Error');
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
  });

  describe('verifyMagicLink', () => {
    it('returns JWT token for valid magic link', async () => {
      const nodemailer = await import('nodemailer');
      const transport = nodemailer.default.createTransport();
      const sendMailSpy = vi.spyOn(transport, 'sendMail');

      await requestMagicLink('admin@example.com');

      const emailCall = sendMailSpy.mock.calls[0][0];
      const tokenMatch = emailCall.html.match(/token=([a-f0-9]+)/);
      const token = tokenMatch[1];

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

      verifyMagicLink(token);

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

      const mockDate = Date.now() + 16 * 60 * 1000;
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
      const tampered = jwtToken.substring(0, jwtToken.length - 1) + 'X';

      expect(() => verifyJWT(tampered))
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
          authorization: jwtToken,
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
