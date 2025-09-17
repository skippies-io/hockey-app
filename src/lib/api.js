export const API_BASE = import.meta.env.VITE_API_BASE;

export async function getSheet(sheetName) {
  if (!API_BASE) throw new Error("Missing VITE_API_BASE");
  const url = `${API_BASE}?sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data.rows || [];
}
