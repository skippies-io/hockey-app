// src/lib/adminAuth.js
import { API_BASE } from "./api";

const TOKEN_KEY = "hj_admin_session_token";
const EMAIL_KEY = "hj_admin_email";
const EXP_KEY = "hj_admin_session_expires_at";
const AUTH_EXPIRED_MESSAGE = "Admin session expired. Please sign in again.";

function readStorage(key) {
  const localValue = localStorage.getItem(key);
  if (localValue) return localValue;
  const sessionValue = sessionStorage.getItem(key);
  if (!sessionValue) return "";
  // Migrate legacy tab-only sessions into persistent storage.
  localStorage.setItem(key, sessionValue);
  sessionStorage.removeItem(key);
  return sessionValue;
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) && ts <= Date.now();
}

function ensureActiveSession() {
  const expiresAt = readStorage(EXP_KEY);
  if (isExpired(expiresAt)) {
    clearAdminSession();
    return false;
  }
  return true;
}

function authExpiredError() {
  const err = new Error(AUTH_EXPIRED_MESSAGE);
  err.code = "ADMIN_AUTH_EXPIRED";
  return err;
}

export function getAdminToken() {
  if (!ensureActiveSession()) return "";
  return readStorage(TOKEN_KEY);
}

export function getAdminEmail() {
  if (!ensureActiveSession()) return "";
  return readStorage(EMAIL_KEY);
}

export function getAdminExpiresAt() {
  if (!ensureActiveSession()) return "";
  return readStorage(EXP_KEY);
}

export function setAdminSession({ token, email, expiresAt }) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (email) localStorage.setItem(EMAIL_KEY, email);
  if (expiresAt) localStorage.setItem(EXP_KEY, expiresAt);
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(EXP_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EMAIL_KEY);
  sessionStorage.removeItem(EXP_KEY);
}

export function isAdminAuthed() {
  return ensureActiveSession() && Boolean(readStorage(TOKEN_KEY));
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
  if (!token) {
    throw authExpiredError();
  }
  const headers = new Headers(opts.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...opts, headers });
  if (res.status === 401) {
    clearAdminSession();
    throw authExpiredError();
  }
  return res;
}
