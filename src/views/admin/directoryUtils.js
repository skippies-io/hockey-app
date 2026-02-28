import { API_BASE } from "../../lib/api";

export function linkLabel(url, fallback) {
  if (!url) return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || fallback;
  } catch {
    return fallback;
  }
}

export function buildRequest(url, method, body) {
  return {
    url,
    options: {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  };
}

export function adminUrl(path) {
  return `${API_BASE}/admin/${path}`;
}
