import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function okJson(data) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}

function fail(status = 500) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ ok: false }) });
}

describe('venueApi', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('throws when API_BASE is missing', async () => {
    vi.doMock('./api', () => ({ API_BASE: '' }));
    const api = await import('./venueApi');

    await expect(api.getVenues()).rejects.toThrow('Missing API_BASE');
    await expect(api.getVenue('v1')).rejects.toThrow('Missing API_BASE');
    await expect(api.createVenue({ name: 'X' })).rejects.toThrow('Missing API_BASE');
    await expect(api.updateVenue('v1', { name: 'X' })).rejects.toThrow('Missing API_BASE');
    await expect(api.deleteVenue('v1')).rejects.toThrow('Missing API_BASE');
  });

  it('getVenues fetches and returns JSON', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const fetchMock = vi.fn().mockReturnValue(okJson([{ id: 'v1' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { getVenues } = await import('./venueApi');

    const venues = await getVenues();
    expect(venues).toEqual([{ id: 'v1' }]);
    expect(fetchMock).toHaveBeenCalledWith('http://example.test/api/admin/venues');
  });

  it('getVenue fetches a single venue by id', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const fetchMock = vi.fn().mockReturnValue(okJson({ id: 'v1', name: 'A' }));
    vi.stubGlobal('fetch', fetchMock);

    const { getVenue } = await import('./venueApi');

    const venue = await getVenue('v1');
    expect(venue).toEqual({ id: 'v1', name: 'A' });
    expect(fetchMock).toHaveBeenCalledWith('http://example.test/api/admin/venues/v1');
  });

  it('createVenue POSTs JSON body', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const fetchMock = vi.fn().mockReturnValue(okJson({ id: 'v1' }));
    vi.stubGlobal('fetch', fetchMock);

    const { createVenue } = await import('./venueApi');

    const payload = { name: 'Rink A', location: 'Cape Town', notes: 'Indoor' };
    const created = await createVenue(payload);

    expect(created).toEqual({ id: 'v1' });
    expect(fetchMock).toHaveBeenCalledWith('http://example.test/api/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('updateVenue PATCHs JSON body', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const fetchMock = vi.fn().mockReturnValue(okJson({ id: 'v1', name: 'B' }));
    vi.stubGlobal('fetch', fetchMock);

    const { updateVenue } = await import('./venueApi');

    const updated = await updateVenue('v1', { name: 'B' });
    expect(updated).toEqual({ id: 'v1', name: 'B' });
    expect(fetchMock).toHaveBeenCalledWith('http://example.test/api/admin/venues/v1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'B' }),
    });
  });

  it('deleteVenue issues DELETE and returns void', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const fetchMock = vi.fn().mockReturnValue(Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const { deleteVenue } = await import('./venueApi');

    await expect(deleteVenue('v1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('http://example.test/api/admin/venues/v1', { method: 'DELETE' });
  });

  it('throws a status error when fetch fails', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(fail(403)));

    const { getVenues } = await import('./venueApi');

    await expect(getVenues()).rejects.toMatchObject({ status: 403 });
    await expect(getVenues()).rejects.toThrow('Failed to fetch venues: 403');
  });
});
