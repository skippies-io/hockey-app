import { API_BASE, tournamentsEndpoint } from '../lib/api';

export default function DebugInfo() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') return null;

  const buildId = import.meta.env.VITE_BUILD_ID;
  const apiBase = API_BASE || 'unknown';
  const tournamentsUrl = tournamentsEndpoint() || 'disabled';
  const timestamp = new Date().toISOString();

  const style = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    fontSize: '12px',
    background: 'rgba(0,0,0,0.85)',
    color: '#fff',
    padding: '6px 10px',
    zIndex: 9999,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  };

  return (
    <div style={style}>
      HJ build: {buildId} | API base: {apiBase} | Tournaments: {tournamentsUrl} | Time: {timestamp}
    </div>
  );
}
