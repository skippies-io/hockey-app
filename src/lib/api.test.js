import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("refreshAll clears session storage keys", async () => {
    const { refreshAll } = await import("./api.js");
    sessionStorage.setItem('hj:cache:v1:test', 'val');
    sessionStorage.setItem('non-hj', 'val');

    refreshAll();
    expect(sessionStorage.getItem('hj:cache:v1:test')).toBeNull();
    expect(sessionStorage.getItem('non-hj')).toBe('val');
  });
});
