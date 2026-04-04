import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function okJson(data) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
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
    vi.doMock('./adminAuth', () => ({ adminFetch: vi.fn() }));

    const api = await import('./venueApi');

    await expect(api.getVenues()).rejects.toThrow('Missing API_BASE');
    await expect(api.getVenue('v1')).rejects.toThrow('Missing API_BASE');
    await expect(api.createVenue({ name: 'X' })).rejects.toThrow('Missing API_BASE');
    await expect(api.updateVenue('v1', { name: 'X' })).rejects.toThrow('Missing API_BASE');
    await expect(api.deleteVenue('v1')).rejects.toThrow('Missing API_BASE');
  });

  it('getVenues calls adminFetch and returns JSON', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(okJson([{ id: 'v1' }]));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { getVenues } = await import('./venueApi');

    const venues = await getVenues();
    expect(venues).toEqual([{ id: 'v1' }]);
    expect(adminFetch).toHaveBeenCalledWith('/admin/venues');
  });

  it('getVenue calls adminFetch for a single venue by id', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(okJson({ id: 'v1', name: 'A' }));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { getVenue } = await import('./venueApi');

    const venue = await getVenue('v1');
    expect(venue).toEqual({ id: 'v1', name: 'A' });
    expect(adminFetch).toHaveBeenCalledWith('/admin/venues/v1');
  });

  it('createVenue POSTs JSON body via adminFetch', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(okJson({ id: 'v1' }));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { createVenue } = await import('./venueApi');

    const payload = { name: 'Rink A', location: 'Cape Town', notes: 'Indoor' };
    const created = await createVenue(payload);

    expect(created).toEqual({ id: 'v1' });
    expect(adminFetch).toHaveBeenCalledWith('/admin/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('updateVenue PATCHs JSON body via adminFetch', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(okJson({ id: 'v1', name: 'B' }));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { updateVenue } = await import('./venueApi');

    const updated = await updateVenue('v1', { name: 'B' });
    expect(updated).toEqual({ id: 'v1', name: 'B' });
    expect(adminFetch).toHaveBeenCalledWith('/admin/venues/v1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'B' }),
    });
  });

  it('deleteVenue issues DELETE via adminFetch and returns void', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(Promise.resolve({ ok: true, status: 204 }));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { deleteVenue } = await import('./venueApi');

    await expect(deleteVenue('v1')).resolves.toBeUndefined();
    expect(adminFetch).toHaveBeenCalledWith('/admin/venues/v1', { method: 'DELETE' });
  });

  it('getVenues throws a status error when request fails', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(fail(403));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { getVenues } = await import('./venueApi');

    await expect(getVenues()).rejects.toMatchObject({ status: 403 });
    await expect(getVenues()).rejects.toThrow('Failed to fetch venues: 403');
  });

  it('getVenue throws a status error when request fails', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(fail(404));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { getVenue } = await import('./venueApi');

    await expect(getVenue('v404')).rejects.toMatchObject({ status: 404 });
    await expect(getVenue('v404')).rejects.toThrow('Failed to fetch venue: 404');
  });

  it('createVenue throws a status error when request fails', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(fail(400));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { createVenue } = await import('./venueApi');

    await expect(createVenue({ name: 'Bad payload' })).rejects.toMatchObject({ status: 400 });
    await expect(createVenue({ name: 'Bad payload' })).rejects.toThrow('Failed to create venue: 400');
  });

  it('updateVenue throws a status error when request fails', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(fail(409));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { updateVenue } = await import('./venueApi');

    await expect(updateVenue('v1', { name: 'Conflict' })).rejects.toMatchObject({ status: 409 });
    await expect(updateVenue('v1', { name: 'Conflict' })).rejects.toThrow('Failed to update venue: 409');
  });

  it('deleteVenue throws a status error when request fails', async () => {
    vi.doMock('./api', () => ({ API_BASE: 'http://example.test/api' }));
    const adminFetch = vi.fn().mockReturnValue(fail(500));
    vi.doMock('./adminAuth', () => ({ adminFetch }));

    const { deleteVenue } = await import('./venueApi');

    await expect(deleteVenue('v1')).rejects.toMatchObject({ status: 500 });
    await expect(deleteVenue('v1')).rejects.toThrow('Failed to delete venue: 500');
  });
});
