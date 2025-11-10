import { createStore, get, set, del, keys } from "idb-keyval";

const LIST_STORE = createStore("hj-tournaments", "lists");
const DETAIL_STORE = createStore("hj-tournaments", "details");

const listKey = (season = "current") => `list:${season}`;
const detailKey = (slug) => `detail:${slug}`;

async function safe(operation) {
  try {
    return await operation();
  } catch (err) {
    console.warn("[tournamentStore] IndexedDB unavailable", err);
    return null;
  }
}

export function loadTournamentList(season) {
  return safe(() => get(listKey(season), LIST_STORE));
}

export function saveTournamentList(season, payload) {
  return safe(() => set(listKey(season), payload, LIST_STORE));
}

export function clearTournamentLists() {
  return safe(async () => {
    const allKeys = await keys(LIST_STORE);
    await Promise.all(allKeys.map(k => del(k, LIST_STORE)));
  });
}

export function loadTournamentDetail(slug) {
  return safe(() => get(detailKey(slug), DETAIL_STORE));
}

export function saveTournamentDetail(slug, payload) {
  return safe(() => set(detailKey(slug), payload, DETAIL_STORE));
}

export function removeTournamentDetail(slug) {
  return safe(() => del(detailKey(slug), DETAIL_STORE));
}
