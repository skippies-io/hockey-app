import { describe, it, expect } from 'vitest';
import { generateICS } from '../../server/ics.mjs';

const BASE_ROW = {
  Date: '2026-03-15',
  Time: '10:00',
  Team1: 'Tigers',
  Team2: 'Lions',
  Venue: 'Pitch 1',
  Pool: 'A',
  Round: 'Round 1',
  Status: '',
  ageId: 'U12',
};

describe('generateICS', () => {
  it('returns a string starting with BEGIN:VCALENDAR and ending with END:VCALENDAR', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('uses CRLF line endings throughout', () => {
    const ics = generateICS([BASE_ROW]);
    // Every \n should be preceded by \r
    const loneNewlines = ics.replace(/\r\n/g, '').includes('\n');
    expect(loneNewlines).toBe(false);
  });

  it('includes required VCALENDAR fields', () => {
    const ics = generateICS([]);
    expect(ics).toContain('VERSION:2.0\r\n');
    expect(ics).toContain('PRODID:-//Hockey Juniors//Fixtures//EN\r\n');
    expect(ics).toContain('CALSCALE:GREGORIAN\r\n');
    expect(ics).toContain('METHOD:PUBLISH\r\n');
  });

  it('uses the provided calName in X-WR-CALNAME', () => {
    const ics = generateICS([], 'My Tournament');
    expect(ics).toContain('X-WR-CALNAME:My Tournament\r\n');
  });

  it('wraps each fixture in VEVENT blocks', () => {
    const ics = generateICS([BASE_ROW, BASE_ROW]);
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(2);
    expect(ics.split('END:VEVENT').length - 1).toBe(2);
  });

  it('sets DTSTART and DTEND correctly for timed fixtures', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics).toContain('DTSTART:20260315T100000\r\n');
    expect(ics).toContain('DTEND:20260315T110000\r\n'); // +60 min
  });

  it('sets DTEND to 60 minutes after DTSTART', () => {
    const row = { ...BASE_ROW, Time: '23:30' };
    const ics = generateICS([row]);
    expect(ics).toContain('DTSTART:20260315T233000\r\n');
    expect(ics).toContain('DTEND:20260315T003000\r\n'); // wraps midnight → 00:30
  });

  it('uses VALUE=DATE for fixtures without a time', () => {
    const row = { ...BASE_ROW, Time: '' };
    const ics = generateICS([row]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260315\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260315\r\n');
    expect(ics).not.toContain('DTSTART:20260315T');
  });

  it('uses VALUE=DATE when time is TBD', () => {
    const row = { ...BASE_ROW, Time: 'TBD' };
    const ics = generateICS([row]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260315\r\n');
  });

  it('includes SUMMARY with team names', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics).toContain('SUMMARY:Tigers vs Lions\r\n');
  });

  it('includes LOCATION when Venue is set', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics).toContain('LOCATION:Pitch 1\r\n');
  });

  it('omits LOCATION when Venue is empty', () => {
    const row = { ...BASE_ROW, Venue: '' };
    const ics = generateICS([row]);
    expect(ics).not.toContain('LOCATION:');
  });

  it('includes DESCRIPTION with Pool and Round', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics).toContain('Pool: A | Round: Round 1');
  });

  it('omits DESCRIPTION when Pool and Round are both empty', () => {
    const row = { ...BASE_ROW, Pool: '', Round: '' };
    const ics = generateICS([row]);
    expect(ics).not.toContain('DESCRIPTION:');
  });

  it('sets STATUS:CONFIRMED for normal fixtures', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics).toContain('STATUS:CONFIRMED\r\n');
  });

  it('sets STATUS:CANCELLED for cancelled fixtures', () => {
    const row = { ...BASE_ROW, Status: 'Cancelled' };
    const ics = generateICS([row]);
    expect(ics).toContain('STATUS:CANCELLED\r\n');
  });

  it('sets STATUS:CANCELLED for postponed fixtures', () => {
    const row = { ...BASE_ROW, Status: 'Postponed' };
    const ics = generateICS([row]);
    expect(ics).toContain('STATUS:CANCELLED\r\n');
  });

  it('sets STATUS:CONFIRMED for Final fixtures', () => {
    const row = { ...BASE_ROW, Status: 'Final' };
    const ics = generateICS([row]);
    expect(ics).toContain('STATUS:CONFIRMED\r\n');
  });

  it('skips rows with no Date', () => {
    const row = { ...BASE_ROW, Date: '' };
    const ics = generateICS([row]);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('escapes commas and semicolons in team names', () => {
    const row = { ...BASE_ROW, Team1: 'Team, A', Team2: 'Team; B' };
    const ics = generateICS([row]);
    expect(ics).toContain('Team\\, A vs Team\\; B');
  });

  it('includes a UID that is stable and unique per fixture', () => {
    const ics = generateICS([BASE_ROW]);
    expect(ics).toContain('UID:20260315-u12-tigers-lions@hj\r\n');
  });

  it('produces empty calendar (no VEVENTs) for empty rows array', () => {
    const ics = generateICS([]);
    expect(ics).not.toContain('BEGIN:VEVENT');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('folds lines that exceed 75 characters', () => {
    const longVenue = 'A'.repeat(80);
    const row = { ...BASE_ROW, Venue: longVenue };
    const ics = generateICS([row]);
    const lines = ics.split('\r\n');
    const tooLong = lines.filter((l) => l.length > 75 && !l.startsWith(' '));
    expect(tooLong).toHaveLength(0);
  });
});
