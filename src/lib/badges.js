// src/lib/badges.js
export function teamInitials(name = "") {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "??";
  const pick = (words[0][0] || "") + (words[1]?.[0] || "");
  return pick.toUpperCase();
}

export function colorFromName(name = "") {
  // simple deterministic hash → pleasant HSL
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  const s = 65, l = 50;
  return `hsl(${h} ${s}% ${l}%)`;
}