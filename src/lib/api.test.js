import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

function mockOkJson(payload) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(payload),
  });
}

describe("api helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_PROVIDER", "db");
    vi.stubEnv("VITE_DB_API_BASE", "http://localhost:8787/api");
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787");
    vi.stubEnv("VITE_APP_VERSION", "v1");
    globalThis.fetch = mockFetch;
    sessionStorage.clear();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() =>
      mockOkJson({
        groups: [{ id: "U9", label: "U9" }],
        rows: [{ id: 1 }],
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("appends tournamentId when provided", async () => {
    const {
      getGroups,
      getStandingsRows,
      getFixturesRows,
      getFranchises,
    } = await import("./api.js");

    await getGroups("t1");
    await getStandingsRows("t1", "U9");
    await getFixturesRows("t1", "U9");
    await getFranchises("t1");

    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8787/api?groups=1&tournamentId=t1"
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8787/api?sheet=Standings&age=U9&tournamentId=t1"
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8787/api?sheet=Fixtures&age=U9&tournamentId=t1"
    );
    expect(mockFetch).toHaveBeenNthCalledWith(
      4,
      "http://localhost:8787/api?sheet=Franchises&tournamentId=t1"
    );
  });

  it("normalizes API base to include /api", async () => {
    vi.stubEnv("VITE_PROVIDER", "supabase");
    vi.stubEnv("VITE_API_BASE", "http://example.test/");
    vi.resetModules();
    const { API_BASE } = await import("./api.js");
    expect(API_BASE).toBe("http://example.test/api");
  });

  it("keeps /api suffix when already present", async () => {
    vi.stubEnv("VITE_PROVIDER", "supabase");
    vi.stubEnv("VITE_API_BASE", "http://example.test/api");
    vi.resetModules();
    const { API_BASE } = await import("./api.js");
    expect(API_BASE).toBe("http://example.test/api");
  });

  it("prefers DB api base for db provider", async () => {
    vi.stubEnv("VITE_PROVIDER", "db");
    vi.stubEnv("VITE_DB_API_BASE", "http://db.example.test/api");
    vi.stubEnv("VITE_API_BASE", "http://raw.example.test/api");
    vi.resetModules();
    const { API_BASE } = await import("./api.js");
    expect(API_BASE).toBe("http://db.example.test/api");
  });

  it("omits tournamentId when not provided", async () => {
    const { getGroups } = await import("./api.js");

    await getGroups();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8787/api?groups=1"
    );
  });

  it("throws when fetch returns non-ok", async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })
    );

    const { getStandingsRows } = await import("./api.js");

    await expect(getStandingsRows("t1", "U9")).rejects.toThrow("HTTP 500");
  });

  it("getAnnouncements handles success and error", async () => {
    const { getAnnouncements } = await import("./api.js");

    // Success
    mockFetch.mockImplementationOnce(() => mockOkJson({ ok: true, data: [{ id: '1' }] }));
    const data = await getAnnouncements("t1");
    expect(data).toHaveLength(1);

    // Clear cache to force refetch for error test
    sessionStorage.clear();

    // Error
    mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 500 }));
    const empty = await getAnnouncements("t1");
    expect(empty).toHaveLength(0);
  });

  it("sendFeedback sends POST correctly", async () => {
    const { sendFeedback } = await import("./api.js");
    mockFetch.mockImplementationOnce(() => mockOkJson({ ok: true }));

    await sendFeedback({ name: 'N', email: 'E', message: 'M' });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8787/api",
      expect.objectContaining({ method: 'POST' })
    );
  });

  it("sendFeedback throws on network or api failure", async () => {
    const { sendFeedback } = await import("./api.js");

    // Network error
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(sendFeedback({})).rejects.toThrow('Network error');

    // API error
    mockFetch.mockImplementationOnce(() => mockOkJson({ ok: false, error: 'Server says no' }));
    await expect(sendFeedback({})).rejects.toThrow('Server says no');
  });

  it("refreshAll clears session storage keys", async () => {
    const { refreshAll } = await import("./api.js");
    sessionStorage.setItem('hj:cache:v1:test', 'val');
    sessionStorage.setItem('non-hj', 'val');

    refreshAll();
    expect(sessionStorage.getItem('hj:cache:v1:test')).toBeNull();
    expect(sessionStorage.getItem('non-hj')).toBe('val');
  });

  it("tournamentsEndpoint returns correct url", async () => {
    const { tournamentsEndpoint } = await import("./api.js");
    expect(tournamentsEndpoint()).toContain("/api/tournaments");
  });

  it("getGroups sorts groups correctly", async () => {
    const { getGroups } = await import("./api.js");
    mockFetch.mockImplementationOnce(() => mockOkJson({
      ok: true,
      groups: [{ id: 'U11G', label: 'U11G' }, { id: 'U9B', label: 'U9B' }]
    }));
    const groups = await getGroups();
    expect(groups[0].id).toBe('U9B');
  });

  it("getSheet handles legacy call", async () => {
    const { getSheet } = await import("./api.js");
    mockFetch.mockImplementationOnce(() => mockOkJson({ ok: true, rows: [1, 2] }));
    const rows = await getSheet('Tests');
    expect(rows).toHaveLength(2);
  });

  it("fetchJSON handles stale-while-revalidate", async () => {
    const { getGroups } = await import("./api.js");
    const now = Date.now();
    const key = "hj:cache:v1:http://localhost:8787/api?groups=1";

    // Store stale data (90s old, MAX_AGE is 60s)
    sessionStorage.setItem(key, JSON.stringify({
      t: now - 90_000,
      data: { groups: [{ id: 'STALE' }] }
    }));

    mockFetch.mockImplementationOnce(() => mockOkJson({ groups: [{ id: 'FRESH' }] }));

    const data = await getGroups();
    expect(data[0].id).toBe('STALE'); // returns stale immediately

    // Wait for background fetch (it's un-awaited in the code)
    await new Promise(r => setTimeout(r, 20));
    expect(mockFetch).toHaveBeenCalled();
  });

  it("fetchJSON ignores invalid cached JSON and refetches", async () => {
    const { getGroups } = await import("./api.js");
    const key = "hj:cache:v1:http://localhost:8787/api?groups=1";
    sessionStorage.setItem(key, "{bad-json");

    mockFetch.mockImplementationOnce(() => mockOkJson({ groups: [{ id: "FRESH" }] }));
    const data = await getGroups();
    expect(data[0].id).toBe("FRESH");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("stale refresh ignores non-ok response", async () => {
    const { getGroups } = await import("./api.js");
    const now = Date.now();
    const key = "hj:cache:v1:http://localhost:8787/api?groups=1";
    sessionStorage.setItem(
      key,
      JSON.stringify({ t: now - 90_000, data: { groups: [{ id: "STALE" }] } })
    );

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
    );

    const data = await getGroups();
    expect(data[0].id).toBe("STALE");

    await new Promise((r) => setTimeout(r, 0));
    const cached = JSON.parse(sessionStorage.getItem(key));
    expect(cached.data.groups[0].id).toBe("STALE");
  });

  it("fetchJSON background refresh handles failure gracefully", async () => {
    const { getGroups } = await import("./api.js");
    const now = Date.now();
    const key = "hj:cache:v1:http://localhost:8787/api?groups=1";
    sessionStorage.setItem(key, JSON.stringify({ t: now - 90_000, data: { groups: [] } }));

    mockFetch.mockRejectedValueOnce(new Error("BG FAIL"));
    await getGroups();
    await new Promise(r => setTimeout(r, 20));
    // Should not throw, just log/ignore
  });
});
