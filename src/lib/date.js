const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_IDX = new Map();
MONTHS.forEach((name, idx) => {
  MONTH_IDX.set(name.toLowerCase(), idx);
  MONTH_IDX.set(MONTHS_SHORT[idx].toLowerCase(), idx);
});

const DATE_LABEL_RE = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/;
const DATE_DMY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function parseDateToUTCms(raw) {
  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isNaN(ms) ? Number.NaN : ms;
  }

  const str = String(raw ?? "").trim();
  if (!str) return Number.NaN;

  if (typeof raw === "number" || /^\d+$/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num)) return Number.NaN;
    return num < 1e12 ? num * 1000 : num;
  }

  let match = DATE_DMY_RE.exec(str);
  if (match) {
    const day = Number(match[1]);
    const monthIdx = Number(match[2]) - 1;
    const year = Number(match[3]);
    if (monthIdx < 0 || monthIdx > 11 || !year || !day) return Number.NaN;
    return Date.UTC(year, monthIdx, day);
  }

  match = DATE_LABEL_RE.exec(str);
  if (match) {
    const day = Number(match[1]);
    const monthIdx = MONTH_IDX.get(String(match[2]).toLowerCase());
    const year = Number(match[3]);
    if (monthIdx == null || !year || !day) return Number.NaN;
    return Date.UTC(year, monthIdx, day);
  }

  const parsed = Date.parse(str);
  if (Number.isNaN(parsed)) return Number.NaN;
  return parsed;
}

export function formatFixtureDate(raw) {
  const ms = parseDateToUTCms(raw);
  if (Number.isNaN(ms)) return raw || "Date TBD";
  const date = new Date(ms);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTHS_SHORT[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}
