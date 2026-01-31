import { describe, it, expect } from 'vitest';
import { teamProfilePath } from '../lib/routes';

describe('routes', () => {
  it('teamProfilePath encodes ageId and teamName', () => {
    expect(teamProfilePath('U12', 'Team Name')).toBe('/U12/team/Team%20Name');
  });

  it('teamProfilePath handles empty values', () => {
    expect(teamProfilePath('', '')).toBe('//team/');
  });
});