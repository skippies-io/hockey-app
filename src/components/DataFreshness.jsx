import { useEffect, useMemo, useState } from 'react';
import { getCachedLastSyncAt, getMeta } from '../lib/api';

const STALE_WARN_MS = 15 * 60 * 1000;

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return isOnline;
}

function formatRelative(msAgo) {
  if (msAgo < 60_000) return 'just now';
  const mins = Math.round(msAgo / 60_000);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} h ago`;
}

export default function DataFreshness() {
  const isOnline = useOnlineStatus();
  const [lastSyncAt, setLastSyncAt] = useState(() => getCachedLastSyncAt());
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meta = await getMeta();
        if (!alive) return;
        if (meta?.last_sync_at) setLastSyncAt(String(meta.last_sync_at));
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || 'Failed to load freshness');
      }
    })();
    return () => { alive = false; };
  }, []);

  const parsed = useMemo(() => {
    if (!lastSyncAt) return { ok: false };
    const d = new Date(lastSyncAt);
    if (Number.isNaN(d.getTime())) return { ok: false };
    return { ok: true, date: d };
  }, [lastSyncAt]);

  if (!parsed.ok && isOnline) return null;

  const ageMs = parsed.ok ? Date.now() - parsed.date.getTime() : null;
  const stale = ageMs !== null && ageMs > STALE_WARN_MS;
  const danger = !isOnline || stale;

  // Visible-text label — used by tests via textContent and by screen readers
  let label = '';
  if (!isOnline) label += 'Offline';
  if (!isOnline && parsed.ok) label += ' • ';
  if (parsed.ok) label += `Last updated ${formatRelative(ageMs)}`;
  if (stale) label += ' (stale)';

  const tooltipFull = err
    ? `Freshness error: ${err}`
    : parsed.ok
      ? `${label} (${parsed.date.toISOString()})`
      : label;

  return (
    <span
      className="data-freshness-dot"
      aria-label="Data freshness"
      title={tooltipFull}
      style={{ color: danger ? 'var(--hj-color-danger)' : 'var(--hj-color-success)' }}
    >
      {/* dot — visual indicator only */}
      <span aria-hidden="true">●</span>
      {/* status text — visually hidden, present for AT and tests */}
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
