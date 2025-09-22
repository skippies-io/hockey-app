// src/lib/badges.js
const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
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