// Magic-link email delivery.
//
// Production: set SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
// Development / CI: leave SMTP_HOST unset — the link is logged to stdout instead.

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@skippies.io";

let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;
  if (!SMTP_HOST) return null;
  // nodemailer is an optional runtime dependency; only loaded when SMTP is configured.
  const { default: nodemailer } = await import("nodemailer");
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

export async function sendMagicLink(email, token) {
  const link = `${APP_URL}/admin/login/callback?token=${token}`;
  const transport = await getTransporter();
  if (!transport) {
    // No SMTP configured — emit the link so local/CI workflows can follow it.
    console.log(`[MAGIC LINK] To: ${email}  URL: ${link}`);
    return;
  }
  await transport.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: "Your Hockey Admin sign-in link",
    text: `Sign in to Hockey Admin (link expires in 15 minutes):\n\n${link}`,
    html: `<p>Sign in to Hockey Admin (expires in 15 min):</p><p><a href="${link}">${link}</a></p>`,
  });
}
