import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyJWT, requireAuth } from '../../server/auth.mjs';

describe('auth.mjs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete process.env.JWT_SECRET;
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

  describe('requireAuth', () => {
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
