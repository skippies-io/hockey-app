const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export function fixtureSortKey(fx) {
  const rawDate = typeof fx?.date === "string" ? fx.date.trim() : "";
  if (!rawDate) return null;

  const dateMatch = DATE_RE.exec(rawDate);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  let hours = 0;
  let minutes = 0;
  const rawTime = typeof fx?.time === "string" ? fx.time.trim() : "";
  if (rawTime) {
    const timeMatch = TIME_RE.exec(rawTime);
    if (!timeMatch) return null;
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  }

  return Date.UTC(year, month - 1, day, hours, minutes);
}

function sortByKey(fixtures, direction) {
  return fixtures
    .map((fx, idx) => ({ fx, idx, key: fixtureSortKey(fx) }))
    .sort((a, b) => {
      const aKey = a.key;
      const bKey = b.key;
      const aNull = aKey === null;
      const bNull = bKey === null;

      if (aNull && bNull) return a.idx - b.idx;
      if (aNull) return 1;
      if (bNull) return -1;
      if (aKey === bKey) return a.idx - b.idx;

      return direction === "desc" ? bKey - aKey : aKey - bKey;
    })
    .map((entry) => entry.fx);
}

export function sortRecent(fixtures) {
  return sortByKey([...fixtures], "desc");
}

export function sortUpcoming(fixtures) {
  return sortByKey([...fixtures], "asc");
}
