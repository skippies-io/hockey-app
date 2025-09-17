export function toMinutes(t) {
  if (!t) return 0;
  const [hh, mm] = String(t).split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}
export function hasScore(x) {
  const n = Number(x);
  return !Number.isNaN(n) && String(x).trim() !== '';
}
