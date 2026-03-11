import { describe, it, expect, beforeEach, vi } from "vitest";

// Import after setting up fetch mock

describe("adminAuth", () => {
  beforeEach(() => {
    sessionStorage.clear();
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

  it("adminFetch sets Authorization header", async () => {
    const mod = await import("./adminAuth.js");
    mod.setAdminSession({ token: "sess", email: "e", expiresAt: "x" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await mod.adminFetch("/api/admin/announcements", {
      headers: { "X-Test": "1" },
    });

    const [, opts] = globalThis.fetch.mock.calls[0];
    expect(opts.headers.get("Authorization")).toBe("Bearer sess");
    expect(opts.headers.get("X-Test")).toBe("1");
  });
});
