// src/lib/venueApi.js
import { API_BASE } from './api';
import { adminFetch } from './adminAuth';

const basePath = '/admin/venues';

async function parseJson(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const err = new Error(json.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

/**
 * Fetch all venues
 * @returns {Promise<Array>} Array of venue objects
 */
export async function getVenues() {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const res = await adminFetch(basePath);
  const json = await parseJson(res);
  return json.data || [];
}

/**
 * Fetch a single venue by ID
 * @param {string} id - Venue ID
 * @returns {Promise<Object>} Venue object
 */
export async function getVenue(id) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const res = await adminFetch(`${basePath}/${id}`);
  const json = await parseJson(res);
  return json.data;
}

/**
 * Create a new venue
 * @param {Object} venueData - { name, location, notes }
 * @returns {Promise<Object>} Created venue object
 */
export async function createVenue(venueData) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const res = await adminFetch(basePath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venueData),
  });
  const json = await parseJson(res);
  return json.data;
}

/**
 * Update an existing venue
 * @param {string} id - Venue ID
 * @param {Object} venueData - Partial venue object to update
 * @returns {Promise<Object>} Updated venue object
 */
export async function updateVenue(id, venueData) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const res = await adminFetch(`${basePath}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venueData),
  });
  const json = await parseJson(res);
  return json.data;
}

/**
 * Delete a venue
 * @param {string} id - Venue ID
 * @returns {Promise<void>}
 */
export async function deleteVenue(id) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const res = await adminFetch(`${basePath}/${id}`, {
    method: 'DELETE',
  });
  await parseJson(res);
}
