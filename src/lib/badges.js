// src/lib/badges.js
// All colours are WCAG 2.1 AA compliant with white text (≥4.5:1 contrast ratio).
const PALETTE = [
  "#1d4ed8", "#047857", "#b45309", "#b91c1c",
  "#6d28d9", "#0e7490", "#4d7c0f", "#c2410c",
];

export function colorFromName(name = "") {
  const s = String(name).toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function teamInitials(name = "") {
  const s = String(name).trim();
  if (!s) return "?";
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    const w = words[0].replace(/[^a-z0-9]/gi, "");
    return w.slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}