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
 * Fetch a single franchise by ID
 * @param {string} id
 */
export async function getFranchise(id) {
  const res = await adminFetch(`${endpoint()}/${id}`);
  const json = await parseJson(res);
  return json.data;
}

/**
 * Fetch teams linked to a franchise, with tournament/season context
 * @param {string} id
 * @returns {Promise<Array>}
 */
export async function getFranchiseTeams(id) {
  const res = await adminFetch(`${endpoint()}/${id}/teams`);
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
