import { describe, it, expect } from 'vitest';
import {
  normaliseId,
  getAutoFormat,
  getInitials,
  roundRobinPairs,
  getTeamsForDivision,
  buildFixturesForStep5,
} from './TournamentNewWizard.utils';

describe('normaliseId', () => {
  it('lowercases and slugifies a name', () => {
    expect(normaliseId('U11 Boys')).toBe('u11-boys');
  });

  it('strips leading/trailing dashes', () => {
    expect(normaliseId('  --hello-- ')).toBe('hello');
  });

  it('handles empty string', () => {
    expect(normaliseId('')).toBe('');
  });
});

describe('getAutoFormat', () => {
  it('returns rr2 for ≤4 teams', () => {
    expect(getAutoFormat(2)).toBe('rr2');
    expect(getAutoFormat(4)).toBe('rr2');
  });

  it('returns rr1 for 5–8 teams', () => {
    expect(getAutoFormat(5)).toBe('rr1');
    expect(getAutoFormat(8)).toBe('rr1');
  });

  it('returns gs_ko for >8 teams', () => {
    expect(getAutoFormat(9)).toBe('gs_ko');
  });
});

describe('getInitials', () => {
  it('takes first letter of each word', () => {
    expect(getInitials('Purple Panthers')).toBe('PP');
  });

  it('uses first two chars for single-word names', () => {
    expect(getInitials('Knights')).toBe('KN');
  });

  it('returns ?? for empty input', () => {
    expect(getInitials('')).toBe('??');
  });
});

describe('roundRobinPairs', () => {
  it('returns empty for fewer than 2 teams', () => {
    expect(roundRobinPairs([])).toEqual([]);
    expect(roundRobinPairs(['A'])).toEqual([]);
  });

  it('generates 1 pair for 2 teams', () => {
    const pairs = roundRobinPairs(['A', 'B']);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual(['A', 'B', 1]);
  });

  it('generates 3 pairs for 3 teams (odd — BYE added)', () => {
    const pairs = roundRobinPairs(['A', 'B', 'C']);
    // n=3, padded to 4, rounds=3, half=2 → 3 real matches (one BYE slot per round)
    expect(pairs).toHaveLength(3);
    const teams = pairs.flatMap(([a, b]) => [a, b]);
    expect(teams).not.toContain('BYE');
  });

  it('generates 6 pairs for 4 teams', () => {
    const pairs = roundRobinPairs(['A', 'B', 'C', 'D']);
    expect(pairs).toHaveLength(6);
  });

  it('round numbers are sequential starting at 1', () => {
    const pairs = roundRobinPairs(['A', 'B', 'C', 'D']);
    const rounds = pairs.map(([, , r]) => r);
    expect(Math.min(...rounds)).toBe(1);
    expect(Math.max(...rounds)).toBe(3);
  });
});

describe('getTeamsForDivision', () => {
  const entries = {
    'U11B': {
      'f1': { optedIn: true, slots: [{ name: 'Team Alpha' }, { name: 'Team Beta' }] },
      'f2': { optedIn: false, slots: [{ name: 'Team Gamma' }] },
      'f3': { optedIn: true, slots: [{ name: '' }] }, // blank slot — should be skipped
    },
  };

  it('returns only opted-in teams with non-blank names', () => {
    const result = getTeamsForDivision(entries, 'U11B');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Team Alpha', franchiseId: 'f1' });
    expect(result[1]).toEqual({ name: 'Team Beta', franchiseId: 'f1' });
  });

  it('returns empty array for unknown division', () => {
    expect(getTeamsForDivision(entries, 'U13G')).toEqual([]);
  });
});

describe('buildFixturesForStep5', () => {
  const baseStep4 = { formats: {}, poolsA: {}, poolsB: {} };

  it('generates round-robin fixtures for a simple division', () => {
    const step3Entries = {
      'U11B': {
        'f1': { optedIn: true, slots: [{ name: 'Alpha' }] },
        'f2': { optedIn: true, slots: [{ name: 'Beta' }] },
        'f3': { optedIn: true, slots: [{ name: 'Gamma' }] },
      },
    };
    const { fixtures, skippedSameFranchise } = buildFixturesForStep5({
      activeDivisions: ['U11B'],
      step3Entries,
      step4: { ...baseStep4, formats: { 'U11B': 'rr2' } },
    });
    // 3-team RR = 3 fixtures
    expect(fixtures).toHaveLength(3);
    expect(skippedSameFranchise).toBe(0);
    expect(fixtures[0].group_id).toBe('u11b');
    expect(fixtures[0].pool).toBeNull();
  });

  it('skips same-franchise pairings and counts them', () => {
    const step3Entries = {
      'U11B': {
        'f1': {
          optedIn: true,
          slots: [{ name: 'Alpha' }, { name: 'Alpha 2' }],
        },
        'f2': { optedIn: true, slots: [{ name: 'Beta' }] },
      },
    };
    const { fixtures, skippedSameFranchise } = buildFixturesForStep5({
      activeDivisions: ['U11B'],
      step3Entries,
      step4: { ...baseStep4, formats: { 'U11B': 'rr2' } },
    });
    // Alpha vs Alpha 2 is same franchise → skipped
    expect(skippedSameFranchise).toBe(1);
    // remaining cross-franchise pairs: Alpha vs Beta, Alpha 2 vs Beta = 2
    expect(fixtures).toHaveLength(2);
  });

  it('uses gs_ko group-stage pools when isGS is true', () => {
    // Pool A: T1(f1) vs T2(f2) — cross-franchise, 1 fixture
    // Pool B: T3(f1) vs T4(f2) — cross-franchise, 1 fixture
    const step3Entries = {
      'U13B': {
        'f1': { optedIn: true, slots: [{ name: 'T1' }, { name: 'T3' }] },
        'f2': { optedIn: true, slots: [{ name: 'T2' }, { name: 'T4' }] },
      },
    };
    const { fixtures } = buildFixturesForStep5({
      activeDivisions: ['U13B'],
      step3Entries,
      step4: {
        formats: { 'U13B': 'gs_ko' },
        poolsA: { 'U13B': ['T1', 'T2'] },
        poolsB: { 'U13B': ['T3', 'T4'] },
      },
    });
    // Pool A: T1 vs T2 = 1 fixture; Pool B: T3 vs T4 = 1 fixture
    expect(fixtures).toHaveLength(2);
    const poolAs = fixtures.filter((f) => f.pool === 'A');
    const poolBs = fixtures.filter((f) => f.pool === 'B');
    expect(poolAs).toHaveLength(1);
    expect(poolBs).toHaveLength(1);
  });

  it('falls back to ungrouped when gs_ko pools are empty', () => {
    const step3Entries = {
      'U13B': {
        'f1': { optedIn: true, slots: [{ name: 'T1' }] },
        'f2': { optedIn: true, slots: [{ name: 'T2' }] },
      },
    };
    const { fixtures } = buildFixturesForStep5({
      activeDivisions: ['U13B'],
      step3Entries,
      step4: {
        formats: { 'U13B': 'gs_ko' },
        poolsA: { 'U13B': [] },
        poolsB: { 'U13B': [] },
      },
    });
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].pool).toBeNull();
  });

  it('doubles fixtures for rr1 format', () => {
    const step3Entries = {
      'U11G': {
        'f1': { optedIn: true, slots: [{ name: 'A' }] },
        'f2': { optedIn: true, slots: [{ name: 'B' }] },
      },
    };
    const { fixtures } = buildFixturesForStep5({
      activeDivisions: ['U11G'],
      step3Entries,
      step4: { ...baseStep4, formats: { 'U11G': 'rr1' } },
    });
    // 2-team RR = 1 pair × 2 repeats = 2 fixtures
    expect(fixtures).toHaveLength(2);
  });

  it('skips divisions with fewer than 2 teams', () => {
    const step3Entries = {
      'U9B': {
        'f1': { optedIn: true, slots: [{ name: 'Solo' }] },
      },
    };
    const { fixtures } = buildFixturesForStep5({
      activeDivisions: ['U9B'],
      step3Entries,
      step4: baseStep4,
    });
    expect(fixtures).toHaveLength(0);
  });
});
