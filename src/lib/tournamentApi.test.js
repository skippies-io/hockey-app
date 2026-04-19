import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./adminAuth', () => ({
  adminFetch: vi.fn(),
}));

const { adminFetch } = await import('./adminAuth');

function okJson(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true, data }),
  });
}

function noDataJson() {
  return Promise.resolve({
    ok: true, status: 200, json: () => Promise.resolve({ ok: true }),
  });
}

function failJson(status, error) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ ok: false, error }),
  });
}

describe('tournamentApi', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });
  afterEach(() => { vi.clearAllMocks(); });

  it('getAdminTournaments fetches all tournaments', async () => {
    adminFetch.mockResolvedValueOnce(okJson([{ id: 't1', is_active: true }]));
    const api = await import('./tournamentApi');
    const result = await api.getAdminTournaments();
    expect(adminFetch).toHaveBeenCalledWith('/admin/tournaments');
    expect(result).toEqual([{ id: 't1', is_active: true }]);
  });

  it('getAdminTournaments with activeOnly appends query param', async () => {
    adminFetch.mockResolvedValueOnce(okJson([{ id: 't1', is_active: true }]));
    const api = await import('./tournamentApi');
    await api.getAdminTournaments({ activeOnly: true });
    expect(adminFetch).toHaveBeenCalledWith('/admin/tournaments?active=true');
  });

  it('getAdminTournaments returns empty array when data absent', async () => {
    adminFetch.mockResolvedValueOnce(noDataJson());
    const api = await import('./tournamentApi');
    const result = await api.getAdminTournaments();
    expect(result).toEqual([]);
  });

  it('setTournamentActive PATCHes with is_active true', async () => {
    adminFetch.mockResolvedValueOnce(okJson({ id: 't1', is_active: true }));
    const api = await import('./tournamentApi');
    const result = await api.setTournamentActive('t1', true);
    expect(adminFetch).toHaveBeenCalledWith('/admin/tournaments/t1', expect.objectContaining({ method: 'PATCH' }));
    expect(result).toEqual({ id: 't1', is_active: true });
  });

  it('setTournamentActive PATCHes with is_active false', async () => {
    adminFetch.mockResolvedValueOnce(okJson({ id: 't1', is_active: false }));
    const api = await import('./tournamentApi');
    const result = await api.setTournamentActive('t1', false);
    const body = JSON.parse(adminFetch.mock.calls[0][1].body);
    expect(body).toEqual({ is_active: false });
    expect(result).toEqual({ id: 't1', is_active: false });
  });

  it('throws when server responds not ok', async () => {
    adminFetch.mockResolvedValueOnce(failJson(404, 'Tournament not found'));
    const api = await import('./tournamentApi');
    await expect(api.setTournamentActive('missing', false)).rejects.toThrow('Tournament not found');
  });

  it('getAdminAnnouncements fetches announcements', async () => {
    adminFetch.mockResolvedValueOnce(okJson([{ id: 'a1', title: 'Notice' }]));
    const api = await import('./tournamentApi');
    const result = await api.getAdminAnnouncements();
    expect(adminFetch).toHaveBeenCalledWith('/admin/announcements');
    expect(result).toEqual([{ id: 'a1', title: 'Notice' }]);
  });

  it('getAdminAnnouncements returns empty array when data absent', async () => {
    adminFetch.mockResolvedValueOnce(noDataJson());
    const api = await import('./tournamentApi');
    expect(await api.getAdminAnnouncements()).toEqual([]);
  });

  it('getAdminTeams fetches teams for a tournament', async () => {
    adminFetch.mockResolvedValueOnce(okJson([{ id: 'tm1', name: 'Alpha' }]));
    const api = await import('./tournamentApi');
    const result = await api.getAdminTeams('t1');
    expect(adminFetch).toHaveBeenCalledWith('/admin/teams?tournamentId=t1');
    expect(result).toEqual([{ id: 'tm1', name: 'Alpha' }]);
  });

  it('getAdminTeams returns empty array when data absent', async () => {
    adminFetch.mockResolvedValueOnce(noDataJson());
    const api = await import('./tournamentApi');
    expect(await api.getAdminTeams('t1')).toEqual([]);
  });

  it('getAdminGroups fetches groups for a tournament', async () => {
    adminFetch.mockResolvedValueOnce(okJson([{ id: 'g1', label: 'U9' }]));
    const api = await import('./tournamentApi');
    const result = await api.getAdminGroups('t1');
    expect(adminFetch).toHaveBeenCalledWith('/admin/groups?tournamentId=t1');
    expect(result).toEqual([{ id: 'g1', label: 'U9' }]);
  });

  it('getAdminGroups returns empty array when data absent', async () => {
    adminFetch.mockResolvedValueOnce(noDataJson());
    const api = await import('./tournamentApi');
    expect(await api.getAdminGroups('t1')).toEqual([]);
  });

  it('getUnscoredFixtures fetches unscored fixtures', async () => {
    const serverTime = new Date().toISOString();
    adminFetch.mockResolvedValueOnce(Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve({ ok: true, data: [{ fixture_id: 'f1' }], server_time: serverTime }),
    }));
    const api = await import('./tournamentApi');
    const result = await api.getUnscoredFixtures('t1');
    expect(adminFetch).toHaveBeenCalledWith('/admin/unscored-fixtures?tournamentId=t1');
    expect(result).toEqual({ fixtures: [{ fixture_id: 'f1' }], serverTime });
  });

  it('getUnscoredFixtures returns empty fixtures when data absent', async () => {
    adminFetch.mockResolvedValueOnce(noDataJson());
    const api = await import('./tournamentApi');
    const result = await api.getUnscoredFixtures('t1');
    expect(result).toEqual({ fixtures: [], serverTime: undefined });
  });
});
