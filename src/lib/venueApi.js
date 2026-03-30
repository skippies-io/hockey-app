// src/lib/venueApi.js
import { API_BASE } from './api';

const endpoint = () => `${API_BASE}/admin/venues`;

/**
 * Fetch all venues
 * @returns {Promise<Array>} Array of venue objects
 */
export async function getVenues() {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const url = endpoint();
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Failed to fetch venues: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Fetch a single venue by ID
 * @param {string} id - Venue ID
 * @returns {Promise<Object>} Venue object
 */
export async function getVenue(id) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const url = `${endpoint()}/${id}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`Failed to fetch venue: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Create a new venue
 * @param {Object} venueData - { name, location, notes }
 * @returns {Promise<Object>} Created venue object
 */
export async function createVenue(venueData) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const url = endpoint();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venueData),
  });
  if (!res.ok) {
    const err = new Error(`Failed to create venue: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Update an existing venue
 * @param {string} id - Venue ID
 * @param {Object} venueData - Partial venue object to update
 * @returns {Promise<Object>} Updated venue object
 */
export async function updateVenue(id, venueData) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const url = `${endpoint()}/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(venueData),
  });
  if (!res.ok) {
    const err = new Error(`Failed to update venue: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Delete a venue
 * @param {string} id - Venue ID
 * @returns {Promise<void>}
 */
export async function deleteVenue(id) {
  if (!API_BASE) throw new Error('Missing API_BASE');
  const url = `${endpoint()}/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = new Error(`Failed to delete venue: ${res.status}`);
    err.status = res.status;
    throw err;
  }
}
