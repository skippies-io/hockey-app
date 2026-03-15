const OVERDUE_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Returns true if the fixture is past its scheduled time by more than
 * OVERDUE_THRESHOLD_MS and has no scores recorded yet.
 *
 * @param {object} row - fixture row with date, time, score1, score2
 * @param {number} [now] - current timestamp in ms (injectable for testing)
 */
export function isOverdue(row, now = Date.now()) {
  if (row.score1 !== '' && row.score1 != null) return false;
  if (row.score2 !== '' && row.score2 != null) return false;
  if (!row.date || !row.time || row.time === 'TBD') return false;
  const scheduled = new Date(`${row.date}T${row.time}`);
  if (Number.isNaN(scheduled.getTime())) return false;
  return now - scheduled.getTime() > OVERDUE_THRESHOLD_MS;
}
