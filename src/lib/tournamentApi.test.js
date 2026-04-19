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
    adminFetch.mockResolvedValueOnce(Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    }));
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
});
