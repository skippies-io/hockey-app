// server/ics.mjs
// Generates RFC 5545 (iCalendar) content from fixture row objects.

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

// RFC 5545 §3.1: fold lines longer than 75 octets with CRLF + SPACE.
function foldLine(line) {
  if (line.length <= 75) return line;
  let out = '';
  while (line.length > 75) {
    out += line.slice(0, 75) + '\r\n ';
    line = line.slice(75);
  }
  return out + line;
}

// Add `minutes` to a HHMMSS string, returning a new HHMMSS string.
function addMinutes(timeHHMMSS, minutes) {
  const hh = parseInt(timeHHMMSS.slice(0, 2), 10);
  const mm = parseInt(timeHHMMSS.slice(2, 4), 10);
  const total = hh * 60 + mm + minutes;
  return String(Math.floor(total / 60) % 24).padStart(2, '0') +
    String(total % 60).padStart(2, '0') +
    '00';
}

/**
 * Convert an array of fixture row objects into an RFC 5545 ICS string.
 * Each row must have the shape produced by mapFixtureRow in server/index.mjs:
 *   { Date, Time, Team1, Team2, Venue, Pool, Round, Status, ageId }
 */
export function generateICS(rows, calName = 'Hockey Fixtures') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hockey Juniors//Fixtures//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeIcsText(calName)}`),
  ];

  for (const row of rows) {
    const { Date: date, Time: time, Team1, Team2, Venue, Pool, Round, Status, ageId } = row;
    if (!date) continue;

    const dateCompact = date.replace(/-/g, '');
    const timeStr = String(time || '').trim();
    const hasTime = /^\d{2}:\d{2}$/.test(timeStr);

    let dtstart, dtend;
    if (hasTime) {
      const [hh, mm] = timeStr.split(':');
      const startHHMMSS = `${hh}${mm}00`;
      dtstart = `${dateCompact}T${startHHMMSS}`;
      dtend = `${dateCompact}T${addMinutes(startHHMMSS, 60)}`;
    } else {
      dtstart = dateCompact;
      dtend = dateCompact;
    }

    const uid = [dateCompact, ageId, Team1, Team2]
      .map((s) => String(s || '').replace(/\s+/g, '').toLowerCase())
      .join('-') + '@hj';

    const summary = `${escapeIcsText(Team1)} vs ${escapeIcsText(Team2)}`;
    const descParts = [Pool && `Pool: ${Pool}`, Round && `Round: ${Round}`].filter(Boolean);
    const description = escapeIcsText(descParts.join(' | '));

    const statusLower = String(Status || '').toLowerCase();
    const eventStatus =
      statusLower === 'cancelled' || statusLower === 'postponed' ? 'CANCELLED' : 'CONFIRMED';

    const event = ['BEGIN:VEVENT', foldLine(`UID:${uid}`)];
    if (hasTime) {
      event.push(`DTSTART:${dtstart}`);
      event.push(`DTEND:${dtend}`);
    } else {
      event.push(`DTSTART;VALUE=DATE:${dtstart}`);
      event.push(`DTEND;VALUE=DATE:${dtend}`);
    }
    event.push(foldLine(`SUMMARY:${summary}`));
    if (Venue) event.push(foldLine(`LOCATION:${escapeIcsText(Venue)}`));
    if (description) event.push(foldLine(`DESCRIPTION:${description}`));
    event.push(`STATUS:${eventStatus}`);
    event.push('END:VEVENT');
    lines.push(...event);
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
