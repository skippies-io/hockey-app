# Admin Authentication - Magic Links

This document describes the magic link authentication system implemented for the Hockey App admin panel.

## Overview

The admin panel uses **magic link authentication** for secure, password-less access. When an admin user wants to log in, they enter their email address and receive a link via email. Clicking the link logs them in without requiring a password.

## How It Works

1. **Request Magic Link**: User visits `/admin/login` and enters their email
2. **Send Email**: Backend generates a unique token and emails it to the user
3. **Verify Token**: User clicks the link in the email (`/admin/verify?token=xxx`)
4. **Create Session**: Backend verifies the token and returns a JWT
5. **Store JWT**: Frontend stores the JWT in localStorage
6. **Access Protected Routes**: All subsequent admin API requests include the JWT

## Architecture

### Backend Components

#### `server/auth.mjs`
Core authentication module that handles:
- Token generation (32-byte random hex)
- Email sending via Gmail SMTP
- Token verification (15-minute TTL)
- JWT creation and validation
- In-memory token storage (TODO: migrate to Redis for production)

#### Endpoints

**POST /api/admin/auth/request-link**
- Public endpoint (no auth required)
- Request body: `{ "email": "admin@example.com" }`
- Sends magic link email
- Response: `{ "ok": true, "message": "Magic link sent to your email" }`

**POST /api/admin/auth/verify**
- Public endpoint (no auth required)
- Request body: `{ "token": "abc123..." }`
- Verifies token and returns JWT
- Response: `{ "ok": true, "token": "eyJhbGci...", "email": "admin@example.com" }`

**All other /api/admin/* routes**
- Protected endpoints (require `Authorization: Bearer <jwt>` header)
- Return 401 if token is missing or invalid

### Frontend Components

#### `src/views/admin/LoginPage.jsx`
Login form where users request a magic link by entering their email.

#### `src/views/admin/VerifyPage.jsx`
Handles the `/admin/verify?token=xxx` route:
- Extracts token from URL
- Verifies token with backend
- Stores JWT and email in localStorage
- Redirects to admin panel

#### `src/views/admin/RequireAuth.jsx`
Auth guard component that wraps protected admin routes:
- Checks for JWT in localStorage
- Redirects to `/admin/login` if no token present
- Renders children if authenticated

#### `src/views/admin/AdminLayout.jsx`
Updated to show logged-in email and logout button.

### API Integration

All admin API calls now include the `Authorization` header:

```javascript
function getAuthHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

fetch('/api/admin/announcements', { headers: getAuthHeaders() });
```

## Configuration

### Environment Variables

Add these to `server/.env`:

```bash
# Gmail credentials for sending magic links
GMAIL_USER="leroy@lbdc.co.za"
GMAIL_APP_PASSWORD="your-16-char-app-password"

# JWT secret (use a strong random value in production)
JWT_SECRET="your-secret-key-change-in-production"

# Base URL for magic link (frontend URL)
BASE_URL="http://localhost:5173"
```

### Gmail Setup

1. Enable 2FA on your Google account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Copy the 16-character password (no spaces)
3. Set `GMAIL_APP_PASSWORD` to this value

**TODO**: Migrate to Gmail OAuth for better security (currently using SMTP with app password).

## Security Features

✅ **Token TTL**: Magic link tokens expire after 15 minutes
✅ **One-time use**: Tokens are deleted after successful verification
✅ **JWT expiry**: JWT tokens expire after 7 days
✅ **HTTPS required in production**: Tokens should only be sent over HTTPS
✅ **Backend validation**: All admin API routes verify the JWT

## TODO / Future Improvements

- [ ] **Email Allowlist**: Add environment variable `ADMIN_EMAILS` to restrict who can request magic links
- [ ] **Redis Token Storage**: Move from in-memory Map to Redis for distributed systems
- [ ] **Gmail OAuth**: Replace SMTP app password with OAuth for better security
- [ ] **JWT Refresh Tokens**: Add refresh token flow for longer sessions
- [ ] **Rate Limiting**: Limit magic link requests per email/IP
- [ ] **Audit Log**: Log all admin authentication events

## Testing

### Manual Test Flow

1. **Request Magic Link**
   ```bash
   curl -X POST http://localhost:8787/api/admin/auth/request-link \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```
   - ✓ Email should be received within seconds
   - ✓ Check spam folder if not in inbox

2. **Click Magic Link**
   - ✓ Should redirect to `/admin/verify?token=...`
   - ✓ Should show "Verifying..." then "Login successful!"
   - ✓ Should redirect to `/admin/announcements`

3. **Access Admin Routes**
   - ✓ Should be able to view announcements
   - ✓ Should be able to create/edit announcements
   - ✓ JWT token should be sent in headers

4. **Token Expiry**
   - Wait 15 minutes after requesting magic link
   - Try to verify the token
   - ✓ Should show "Invalid or expired token"

5. **Logout**
   - Click "Log out" button in sidebar
   - ✓ Should redirect to `/admin/login`
   - ✓ Token should be removed from localStorage

6. **Unauthorised Access**
   - Clear localStorage
   - Try to access `/admin/announcements`
   - ✓ Should redirect to `/admin/login`

## Implementation Notes

- All code uses UK/SA English spelling (authorised, unauthorised, etc.)
- Frontend stores JWT in `localStorage` with key `admin_token`
- Backend uses in-memory Map for token storage (TODO: Redis)
- JWTs are signed with HS256 algorithm
- Magic link format: `${BASE_URL}/admin/verify?token=${token}`

## Troubleshooting

**Email not sending?**
- Check `GMAIL_APP_PASSWORD` is set correctly
- Verify Gmail account has 2FA enabled
- Check server logs for nodemailer errors

**401 Unauthorised errors?**
- Check JWT token is stored in localStorage
- Verify `Authorization` header is being sent
- Check JWT hasn't expired (7 day expiry)

**Token already used / expired?**
- Magic links are one-time use only
- Tokens expire after 15 minutes
- Request a new magic link
