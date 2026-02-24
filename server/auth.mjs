import crypto from "node:crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

// TODO: Upgrade to Redis for production for distributed token storage
// In-memory token store with TTL (15 minutes)
const magicLinkTokens = new Map();
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// JWT secret (must be provided via env)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set for admin authentication");
}
const JWT_EXPIRES_IN = "7d"; // JWT valid for 7 days

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function isEmailAllowed(email) {
  if (ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase());
}

/**
 * Generate a magic link token
 */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create email transporter using Gmail SMTP
 * TODO: Migrate to Gmail OAuth for better security
 */
function createEmailTransporter() {
  const gmailUser = process.env.GMAIL_USER || "leroy@lbdc.co.za";
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailPass) {
    throw new Error("GMAIL_APP_PASSWORD not set");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });
}

/**
 * Send magic link email
 */
async function sendMagicLinkEmail(email, token) {
  const transporter = createEmailTransporter();
  const baseUrl = process.env.BASE_URL || "https://localhost:5173";
  const magicLink = `${baseUrl}/admin/verify?token=${token}`;

  const mailOptions = {
    from: process.env.GMAIL_USER || "leroy@lbdc.co.za",
    to: email,
    subject: "Your Hockey App Admin Login Link",
    html: `
      <h2>Hockey App Admin Login</h2>
      <p>Click the link below to log in to the admin panel:</p>
      <p><a href="${magicLink}">${magicLink}</a></p>
      <p>This link will expire in 15 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Request a magic link
 */
export async function requestMagicLink(email) {
  if (!email || !email.includes("@")) {
    throw new Error("Invalid email address");
  }

  if (!isEmailAllowed(email)) {
    throw new Error("Email not authorised for admin access");
  }

  const token = generateToken();
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  magicLinkTokens.set(token, { email, expiresAt });

  // Clean up expired tokens periodically
  cleanupExpiredTokens();

  await sendMagicLinkEmail(email, token);

  return { success: true };
}

/**
 * Verify magic link token and return JWT
 */
export function verifyMagicLink(token) {
  const tokenData = magicLinkTokens.get(token);

  if (!tokenData) {
    throw new Error("Invalid or expired token");
  }

  if (Date.now() > tokenData.expiresAt) {
    magicLinkTokens.delete(token);
    throw new Error("Token has expired");
  }

  // Token is valid, delete it (one-time use)
  magicLinkTokens.delete(token);

  // Generate JWT
  const jwtToken = jwt.sign(
    { email: tokenData.email, role: "admin" },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { token: jwtToken, email: tokenData.email };
}

/**
 * Verify JWT token from request
 */
export function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    throw new Error("Invalid or expired session");
  }
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of magicLinkTokens.entries()) {
    if (now > data.expiresAt) {
      magicLinkTokens.delete(token);
    }
  }
}

/**
 * Middleware to check admin authentication
 */
export function requireAuth(req) {
  const authHeader = req.headers.authorisation || req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorised: No token provided");
  }

  const token = authHeader.substring(7);
  const decoded = verifyJWT(token);
  
  return decoded;
}
