import { describe, it, expect, beforeEach, vi } from "vitest";

// Import after setting up fetch mock

describe("adminAuth", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("setAdminSession stores token/email/expiry", async () => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({ token: "t", email: "e", expiresAt: "x" });
    expect(mod.getAdminToken()).toBe("t");
    expect(mod.getAdminEmail()).toBe("e");
    expect(mod.getAdminExpiresAt()).toBe("x");
    expect(mod.isAdminAuthed()).toBe(true);
  });

  it("clearAdminSession removes token/email/expiry", async () => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({ token: "t", email: "e", expiresAt: "x" });
    mod.clearAdminSession();
    expect(mod.getAdminToken()).toBe("");
    expect(mod.getAdminEmail()).toBe("");
    expect(mod.getAdminExpiresAt()).toBe("");
    expect(mod.isAdminAuthed()).toBe(false);
  });

  it("requestMagicLink posts to /auth/magic-link", async () => {
    const mod = await import("./adminAuth.js");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const res = await mod.requestMagicLink("a@b.com");
    expect(res.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalled();

    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/magic-link$/);
    expect(opts.method).toBe("POST");
  });

  it("requestMagicLink throws on error response", async () => {
    const mod = await import("./adminAuth.js");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: "nope" }),
    });

    await expect(mod.requestMagicLink("a@b.com")).rejects.toThrow("nope");
  });

  it("verifyMagicToken posts to /auth/verify", async () => {
    const mod = await import("./adminAuth.js");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, token: "sess" }),
    });

    const res = await mod.verifyMagicToken("magic");
    expect(res.token).toBe("sess");

    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/auth\/verify$/);
    expect(opts.method).toBe("POST");
  });

  it("verifyMagicToken throws when json.ok === false", async () => {
    const mod = await import("./adminAuth.js");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 401,
      json: async () => ({ ok: false, error: "bad_token" }),
    });

    await expect(mod.verifyMagicToken("magic")).rejects.toThrow("bad_token");
  });

  it("adminFetch sets Authorization header and hits /api/admin/* URL", async () => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({ token: "sess", email: "e", expiresAt: "x" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    // Paths passed to adminFetch must NOT include the /api prefix — that comes from API_BASE.
    // e.g. "/admin/announcements" → "http://localhost:8787/api/admin/announcements"
    await mod.adminFetch("/admin/announcements", {
      headers: { "X-Test": "1" },
    });

    const [url, opts] = globalThis.fetch.mock.calls[0];
    // Verify the URL ends with /api/admin/announcements (not /api/api/admin/...)
    expect(String(url)).toMatch(/\/api\/admin\/announcements$/);
    expect(String(url)).not.toMatch(/\/api\/api\//); // guard against double /api prefix
    expect(opts.headers.get("Authorization")).toBe("Bearer sess");
    expect(opts.headers.get("X-Test")).toBe("1");
  });

  it("migrates legacy sessionStorage session into localStorage", async () => {
    sessionStorage.setItem("hj_admin_session_token", "legacy-token");
    const mod = await import("./adminAuth.js");
    expect(mod.getAdminToken()).toBe("legacy-token");
    expect(localStorage.getItem("hj_admin_session_token")).toBe("legacy-token");
    expect(sessionStorage.getItem("hj_admin_session_token")).toBeNull();
  });

  it("treats expired session as unauthenticated", async () => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({
      token: "expired-token",
      email: "e",
      expiresAt: "2000-01-01T00:00:00.000Z",
    });
    expect(mod.getAdminToken()).toBe("");
    expect(mod.isAdminAuthed()).toBe(false);
  });

  it.each([
    ["/admin/franchises", /\/api\/admin\/franchises$/],
    ["/admin/venues", /\/api\/admin\/venues$/],
    ["/admin/franchises/f1", /\/api\/admin\/franchises\/f1$/],
    ["/admin/venues/v1", /\/api\/admin\/venues\/v1$/],
  ])("adminFetch(%s) hits the correct /api/admin/* URL", async (path, expectedPattern) => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({ token: "tok", email: "e", expiresAt: "2099-01-01T00:00:00.000Z" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await mod.adminFetch(path);

    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toMatch(expectedPattern);
    expect(String(url)).not.toMatch(/\/api\/api\//); // guard: no double /api prefix
  });

  it("adminFetch clears session and throws auth error on 401", async () => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({ token: "sess", email: "e", expiresAt: "2099-01-01T00:00:00.000Z" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ status: 401 });

    await expect(mod.adminFetch("/admin/announcements")).rejects.toThrow(
      "Admin session expired. Please sign in again."
    );
    expect(mod.isAdminAuthed()).toBe(false);
  });
});
