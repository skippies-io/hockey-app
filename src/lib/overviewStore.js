import { createStore, get, set, del, keys } from "idb-keyval";

const OVERVIEW_STORE = createStore("hj-overview", "snapshots");
const DIGEST_STORE = createStore("hj-overview", "digests");

const overviewKey = (season = "current") => `overview:${season}`;
const digestKey = (token) => `digest:${token}`;

async function safe(fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn("[overviewStore] IndexedDB unavailable", err);
    return null;
  }
}

export function getAllCachedSeasons() {
  return safe(async () => {
    const allKeys = await keys(OVERVIEW_STORE);
    return allKeys
      .map(String)
      .filter(k => k.startsWith("overview:"))
      .map(k => k.replace("overview:", ""));
  }) || [];
}

export function loadOverviewSnapshot(season) {
  return safe(() => get(overviewKey(season), OVERVIEW_STORE));
}

export function saveOverviewSnapshot(season, payload) {
  return safe(() => set(overviewKey(season), payload, OVERVIEW_STORE));
}

export function clearOverviewSnapshots() {
  return safe(async () => {
    const allKeys = await keys(OVERVIEW_STORE);
    await Promise.all(allKeys.map(k => del(k, OVERVIEW_STORE)));
  });
}

export function loadDigestSnapshot(token) {
  if (!token) return Promise.resolve(null);
  return safe(() => get(digestKey(token), DIGEST_STORE));
}

export function saveDigestSnapshot(token, payload) {
  if (!token) return Promise.resolve(null);
  return safe(() => set(digestKey(token), payload, DIGEST_STORE));
}

export function clearDigestSnapshots() {
  return safe(async () => {
    const all = await keys(DIGEST_STORE);
    await Promise.all(all.map(k => del(k, DIGEST_STORE)));
  });
}
