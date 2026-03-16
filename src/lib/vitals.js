/**
 * Web Vitals + API latency collection.
 *
 * Usage:
 *   import { initVitals, recordApiLatency, getRecentVitals } from './vitals';
 *   initVitals();   // call once at app start
 */

const MAX_ENTRIES = 50;

/** In-memory ring buffer of collected metrics. */
const _buffer = [];

/**
 * Record a single metric entry.
 * @param {{ name: string, value: number, [key: string]: unknown }} metric
 */
export function record(metric) {
  const entry = { name: metric.name, value: metric.value, ts: Date.now() };
  _buffer.push(entry);
  if (_buffer.length > MAX_ENTRIES) _buffer.shift();
}

/**
 * Record an API call's latency.
 * @param {{ endpoint: string, duration: number }} opts
 */
export function recordApiLatency({ endpoint, duration }) {
  const entry = { name: "API", value: duration, endpoint, ts: Date.now() };
  _buffer.push(entry);
  if (_buffer.length > MAX_ENTRIES) _buffer.shift();
}

/** Returns a snapshot of the most recent metrics (newest last). */
export function getRecentVitals() {
  return [..._buffer];
}

/**
 * Initialise Web Vitals collection.
 * Hooks up CLS, FCP, INP, LCP, TTFB observers via the web-vitals library.
 * Safe to call in non-browser environments — the dynamic import won't run.
 */
export async function initVitals() {
  if (typeof window === "undefined") return;
  try {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
    onCLS(record);
    onFCP(record);
    onINP(record);
    onLCP(record);
    onTTFB(record);
  } catch {
    // web-vitals unavailable (e.g. SSR or unsupported browser) — fail silently
  }
}
