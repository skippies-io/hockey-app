import { useEffect, useMemo, useState } from 'react';
import { getCachedLastSyncAt, getMeta } from '../lib/api';

const STALE_WARN_MS = 15 * 60 * 1000; // 15 minutes

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);
  return isOnline;
}

function formatRelative(msAgo) {
  if (msAgo < 60_000) return 'just now';
  const mins = Math.round(msAgo / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} h ago`;
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
        // silent-ish failure: keep cached value
        setErr(e?.message || 'Failed to load freshness');
      }
    })();
    return () => {
      alive = false;
    };
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

  return (
    <div
      style={{
        marginTop: '6px',
        fontSize: '12px',
        color: danger ? 'var(--hj-color-danger, #b91c1c)' : 'var(--hj-color-text-secondary, #555)',
      }}
      aria-label="Data freshness"
      title={err ? `Freshness fetch error: ${err}` : (parsed.ok ? parsed.date.toISOString() : '')}
    >
      {!isOnline && 'Offline'}
      {!isOnline && parsed.ok && ' • '}
      {parsed.ok && `Last updated ${formatRelative(ageMs)}`}
      {stale ? ' (stale)' : ''}
    </div>
  );
}
