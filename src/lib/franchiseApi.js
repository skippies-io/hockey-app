// src/lib/franchiseApi.js
import { adminFetch } from './adminAuth';

const endpoint = () => `/admin/franchises`;

async function parseJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json;
}

/**
 * Fetch all franchises (global directory)
 * @returns {Promise<Array>} Array of franchise objects
 */
export async function getFranchises() {
  const res = await adminFetch(endpoint());
  const json = await parseJson(res);
  return json.data || [];
}

/**
 * Create a new franchise
 * @param {Object} franchiseData
 */
export async function createFranchise(franchiseData) {
  const res = await adminFetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(franchiseData),
  });
  const json = await parseJson(res);
  return json.data;
}

/**
 * Update an existing franchise
 * @param {string} id
 * @param {Object} franchiseData
 */
export async function updateFranchise(id, franchiseData) {
  const res = await adminFetch(`${endpoint()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(franchiseData),
  });
  const json = await parseJson(res);
  return json.data;
}

/**
 * Delete a franchise
 * @param {string} id
 */
export async function deleteFranchise(id) {
  const res = await adminFetch(`${endpoint()}/${id}`, {
    method: 'DELETE',
  });
  await parseJson(res);
}

/**
 * Bulk import franchises by name
 * @param {string} namesText - newline or CSV list
 */
export async function importFranchises(namesText) {
  const res = await adminFetch(`${endpoint()}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names: namesText }),
  });
  const json = await parseJson(res);
  return json.data || [];
}
