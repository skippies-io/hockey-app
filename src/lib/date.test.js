import { describe, it, expect } from 'vitest';
import { parseDateToUTCms, formatFixtureDate } from './date.js';

describe('parseDateToUTCms', () => {
  it('returns ms for valid Date objects', () => {
    const date = new Date(Date.UTC(2026, 1, 7, 12, 0, 0));
    expect(parseDateToUTCms(date)).toBe(date.getTime());
  });

  it('returns NaN for invalid Date objects', () => {
    const bad = new Date('not-a-date');
    expect(Number.isNaN(parseDateToUTCms(bad))).toBe(true);
  });

  it('parses numeric seconds and milliseconds', () => {
    const seconds = 1700000000;
    const millis = 1700000000000;
    expect(parseDateToUTCms(seconds)).toBe(seconds * 1000);
    expect(parseDateToUTCms(millis)).toBe(millis);
  });

  it('parses numeric strings as timestamps', () => {
    expect(parseDateToUTCms('1700000000')).toBe(1700000000 * 1000);
    expect(parseDateToUTCms('1700000000000')).toBe(1700000000000);
  });

  it('parses D/M/YYYY format as UTC', () => {
    const ms = parseDateToUTCms('7/2/2026');
    expect(ms).toBe(Date.UTC(2026, 1, 7));
  });

  it('parses labeled month format as UTC', () => {
    const ms = parseDateToUTCms('07 Feb 2026');
    expect(ms).toBe(Date.UTC(2026, 1, 7));
  });

  it('falls back to Date.parse for ISO strings', () => {
    const iso = '2026-02-07T12:00:00.000Z';
    expect(parseDateToUTCms(iso)).toBe(Date.parse(iso));
  });

  it('returns NaN for empty or invalid input', () => {
    expect(Number.isNaN(parseDateToUTCms(''))).toBe(true);
    expect(Number.isNaN(parseDateToUTCms('not-a-date'))).toBe(true);
  });

  it('returns NaN for invalid day/month values', () => {
    expect(Number.isNaN(parseDateToUTCms('0/2/2026'))).toBe(true);
    expect(Number.isNaN(parseDateToUTCms('31/13/2026'))).toBe(true);
  });

  it('table-driven: parses supported month labels', () => {
    const cases = [
      { input: '1 January 2026', expected: Date.UTC(2026, 0, 1) },
      { input: '02 Feb 2026', expected: Date.UTC(2026, 1, 2) },
      { input: '15 mar 2026', expected: Date.UTC(2026, 2, 15) },
      { input: '30 Apr 2026', expected: Date.UTC(2026, 3, 30) },
    ];

    cases.forEach(({ input, expected }) => {
      expect(parseDateToUTCms(input)).toBe(expected);
    });
  });
});

describe('formatFixtureDate', () => {
  it('formats a valid UTC date as DD Mon YYYY', () => {
    const ms = Date.UTC(2026, 0, 5);
    expect(formatFixtureDate(ms)).toBe('05 Jan 2026');
  });

  it('returns "Date TBD" for empty input', () => {
    expect(formatFixtureDate('')).toBe('Date TBD');
  });

  it('returns raw input for invalid non-empty values', () => {
    expect(formatFixtureDate('not-a-date')).toBe('not-a-date');
  });
});
