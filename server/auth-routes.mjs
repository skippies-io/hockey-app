import { isAllowedEmail, issueMagicToken, verifyMagicToken, issueSession } from "./auth.mjs";
import { sendMagicLink } from "./mailer.mjs";

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

/**
 * POST /api/auth/magic-link
 * Body: { email }
 *
 * Always returns a generic 200 to prevent user enumeration.
 * If the email is on the allowlist, issues a token and sends the link.
 */
export async function handleMagicLinkRequest(req, res, { pool, sendJson }) {
  try {
    if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    const body = await readBody(req);
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email) {
      return sendJson(req, res, 400, { ok: false, error: "Email is required" });
    }

    // Issue + send only for allowlisted addresses; always return the same response.
    if (isAllowedEmail(email)) {
      try {
        const { token } = await issueMagicToken(pool, email);
        await sendMagicLink(email, token);
      } catch (err) {
        // Log but do not expose internals; the generic response is sent below.
        console.error("[auth] magic-link issue error:", err);
      }
    }

    return sendJson(req, res, 200, {
      ok: true,
      message: "If that email is registered, you'll receive a sign-in link shortly.",
    });
  } catch (err) {
    console.error("[auth] magic-link error:", err);
    return sendJson(req, res, 500, { ok: false, error: "Server error" });
  }
}

/**
 * POST /api/auth/verify
 * Body: { token }
 *
 * Verifies the single-use magic token and issues a session Bearer token.
 */
export async function handleVerifyRequest(req, res, { pool, sendJson }) {
  try {
    if (!pool) return sendJson(req, res, 501, { ok: false, error: "DB not configured" });
    const body = await readBody(req);
    const token = String(body?.token || "").trim();
    if (!token) {
      return sendJson(req, res, 400, { ok: false, error: "Token is required" });
    }

    const email = await verifyMagicToken(pool, token);
    if (!email) {
      return sendJson(req, res, 401, { ok: false, error: "Invalid or expired token" });
    }

    const { token: sessionToken, expiresAt } = await issueSession(pool, email);
    return sendJson(req, res, 200, {
      ok: true,
      token: sessionToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[auth] verify error:", err);
    return sendJson(req, res, 500, { ok: false, error: "Server error" });
  }
}
