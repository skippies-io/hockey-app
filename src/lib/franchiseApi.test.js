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

describe('franchiseApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('getFranchise fetches single franchise by id', async () => {
    adminFetch.mockResolvedValueOnce(okJson({ id: 'f1', name: 'Alpha' }));

    const api = await import('./franchiseApi');
    const result = await api.getFranchise('f1');

    expect(adminFetch).toHaveBeenCalledWith('/admin/franchises/f1');
    expect(result).toEqual({ id: 'f1', name: 'Alpha' });
  });

  it('getFranchiseTeams fetches teams for a franchise', async () => {
    const teams = [{ team_id: 't1', team_name: 'Alpha U9', season: '2024-25' }];
    adminFetch.mockResolvedValueOnce(okJson(teams));

    const api = await import('./franchiseApi');
    const result = await api.getFranchiseTeams('f1');

    expect(adminFetch).toHaveBeenCalledWith('/admin/franchises/f1/teams');
    expect(result).toEqual(teams);
  });

  it('getFranchiseTeams returns empty array when data is absent', async () => {
    adminFetch.mockResolvedValueOnce(Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    }));

    const api = await import('./franchiseApi');
    const result = await api.getFranchiseTeams('f1');
    expect(result).toEqual([]);
  });

  it('getFranchises calls admin endpoint and returns data', async () => {
    adminFetch.mockResolvedValueOnce(okJson([{ id: 'f1', name: 'Alpha' }]));

    const api = await import('./franchiseApi');
    const result = await api.getFranchises();

    expect(adminFetch).toHaveBeenCalledWith('/admin/franchises');
    expect(result).toEqual([{ id: 'f1', name: 'Alpha' }]);
  });

  it('createFranchise POSTs and returns created data', async () => {
    adminFetch.mockResolvedValueOnce(okJson({ id: 'f1', name: 'Alpha' }));

    const api = await import('./franchiseApi');
    const created = await api.createFranchise({ name: 'Alpha' });

    expect(adminFetch).toHaveBeenCalledWith('/admin/franchises', expect.objectContaining({ method: 'POST' }));
    expect(created).toEqual({ id: 'f1', name: 'Alpha' });
  });

  it('updateFranchise PATCHes and returns updated data', async () => {
    adminFetch.mockResolvedValueOnce(okJson({ id: 'f1', name: 'Alpha Updated' }));

    const api = await import('./franchiseApi');
    const updated = await api.updateFranchise('f1', { name: 'Alpha Updated' });

    expect(adminFetch).toHaveBeenCalledWith('/admin/franchises/f1', expect.objectContaining({ method: 'PATCH' }));
    expect(updated).toEqual({ id: 'f1', name: 'Alpha Updated' });
  });

  it('deleteFranchise DELETEs and returns void', async () => {
    adminFetch.mockResolvedValueOnce(okJson(undefined));

    const api = await import('./franchiseApi');
    await expect(api.deleteFranchise('f1')).resolves.toBeUndefined();

    expect(adminFetch).toHaveBeenCalledWith('/admin/franchises/f1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('throws when server responds not ok', async () => {
    adminFetch.mockResolvedValueOnce(failJson(400, 'Bad request'));

    const api = await import('./franchiseApi');
    await expect(api.getFranchises()).rejects.toThrow('Bad request');
  });
});
