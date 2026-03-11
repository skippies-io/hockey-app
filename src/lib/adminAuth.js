// src/lib/adminAuth.js
import { API_BASE } from "./api";

const TOKEN_KEY = "hj_admin_session_token";
const EMAIL_KEY = "hj_admin_email";
const EXP_KEY = "hj_admin_session_expires_at";

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export function getAdminEmail() {
  return sessionStorage.getItem(EMAIL_KEY) || "";
}

export function getAdminExpiresAt() {
  return sessionStorage.getItem(EXP_KEY) || "";
}

export function setAdminSession({ token, email, expiresAt }) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  if (email) sessionStorage.setItem(EMAIL_KEY, email);
  if (expiresAt) sessionStorage.setItem(EXP_KEY, expiresAt);
}

export function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(EXP_KEY);
}

export function isAdminAuthed() {
  return Boolean(getAdminToken());
}

function apiUrl(path) {
  if (!API_BASE) throw new Error("Missing API base");
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

export async function requestMagicLink(email) {
  const res = await fetch(apiUrl("/auth/magic-link"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function verifyMagicToken(token) {
  const res = await fetch(apiUrl("/auth/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function adminFetch(path, opts = {}) {
  const token = getAdminToken();
  const headers = new Headers(opts.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...opts, headers });
}
