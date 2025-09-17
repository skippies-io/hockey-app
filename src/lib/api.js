export const API_BASE = import.meta.env.VITE_API_BASE;

async function fetchJSON(url) {
  if (!API_BASE) throw new Error("Missing VITE_API_BASE");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data;
}

const state = {
  loaded: false,
  loadPromise: null,
  standingsAll: [],
  fixturesAll: [],
  groups: [], // [{ id, label }]
};

function labelToId(label) {
  const lbl = String(label || "").trim();
  if (!lbl) return null;
  const ageMatch = /U(\d+)/i.exec(lbl);
  const low = lbl.toLowerCase();
  const code = low.includes("boys") ? "B" : low.includes("girls") ? "G" : low.includes("mixed") ? "M" : "X";
  return ageMatch ? `U${ageMatch[1]}${code}` : `${lbl.replace(/\s+/g, "_")}${code}`;
}

function sortGroups(a, b) {
  const num = (s) => {
    const m = /^U(\d+)/i.exec(s.id || "");
    return m ? parseInt(m[1], 10) : 0;
  };
  const order = { B: 0, G: 1, M: 2, X: 3 };
  const na = num(a), nb = num(b);
  if (na !== nb) return na - nb;
  const ca = (a.id || "").slice(-1), cb = (b.id || "").slice(-1);
  return (order[ca] ?? 9) - (order[cb] ?? 9);
}

async function loadAll() {
  if (state.loadPromise) return state.loadPromise;
  state.loadPromise = (async () => {
    const [s, f] = await Promise.all([
      fetchJSON(`${API_BASE}?sheet=Standings_All`),
      fetchJSON(`${API_BASE}?sheet=Fixtures_All`),
    ]);
    state.standingsAll = s.rows || [];
    state.fixturesAll = f.rows || [];

    const map = new Map();
    function add(label) {
      const id = labelToId(label);
      const lbl = String(label || "").trim();
      if (!id || !lbl) return;
      if (!map.has(id)) map.set(id, { id, label: lbl });
    }
    state.standingsAll.forEach(r => add(r.Age));
    state.fixturesAll.forEach(r => add(r.Age));
    state.groups = Array.from(map.values()).sort(sortGroups);

    state.loaded = true;
  })();
  return state.loadPromise;
}

export async function getGroups() {
  await loadAll();
  return state.groups;
}

export async function getStandingsRows(ageId) {
  await loadAll();
  const g = state.groups.find(x => x.id === ageId) || state.groups[0];
  if (!g) return [];
  return state.standingsAll.filter(r => String(r.Age).trim() === g.label);
}

export async function getFixturesRows(ageId) {
  await loadAll();
  const g = state.groups.find(x => x.id === ageId) || state.groups[0];
  if (!g) return [];
  return state.fixturesAll.filter(r => String(r.Age).trim() === g.label);
}

export async function refreshAll() {
  state.loaded = false;
  state.loadPromise = null;
  return loadAll();
}

// (legacy helper left here intentionally in case something still imports it)
export async function getSheet(sheetName) {
  const data = await fetchJSON(`${API_BASE}?sheet=${encodeURIComponent(sheetName)}`);
  return data.rows || [];
}