// server/security.mjs

const DEFAULT_MAX_BODY_BYTES = 256 * 1024; // 256KB

export function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  // Basic CSP: allow self; allow inline styles (token-based CSS), disallow framing
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
  );
}

export async function readBodyLimited(req, { maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      size += buf.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("payload_too_large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", (err) => reject(err));
  });
}

export function safeErrorMessage(err) {
  if (!err) return "Server error";
  // Explicitly allow our own small sentinel errors
  if (err.message === "payload_too_large") return "payload_too_large";
  return "Server error";
}
