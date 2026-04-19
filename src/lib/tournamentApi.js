import { adminFetch } from './adminAuth';

const endpoint = () => `/admin/tournaments`;

async function parseJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function getAdminTournaments({ activeOnly = false } = {}) {
  const url = activeOnly ? `${endpoint()}?active=true` : endpoint();
  const res = await adminFetch(url);
  const json = await parseJson(res);
  return json.data || [];
}

export async function setTournamentActive(id, isActive) {
  const res = await adminFetch(`${endpoint()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_active: isActive }),
  });
  const json = await parseJson(res);
  return json.data;
}
