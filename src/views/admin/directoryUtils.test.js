import { describe, it, expect, beforeEach, vi } from "vitest";

describe("directoryUtils", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE", "http://localhost:8787/api");
  });

  it("builds admin URLs", async () => {
    const { adminUrl } = await import("./directoryUtils");
    expect(adminUrl("venues")).toBe("http://localhost:8787/api/admin/venues");
  });

  it("builds requests with JSON body", async () => {
    const { buildRequest } = await import("./directoryUtils");
    const req = buildRequest("/api/admin/items", "POST", { name: "Test" });
    expect(req.url).toBe("/api/admin/items");
    expect(req.options.method).toBe("POST");
    expect(req.options.headers).toEqual({ "Content-Type": "application/json" });
    expect(req.options.body).toBe(JSON.stringify({ name: "Test" }));
  });

  it("omits body when none provided", async () => {
    const { buildRequest } = await import("./directoryUtils");
    const req = buildRequest("/api/admin/items", "DELETE");
    expect(req.options.body).toBeUndefined();
    expect(req.options.headers).toBeUndefined();
  });

  it("derives link label from URL", async () => {
    const { linkLabel } = await import("./directoryUtils");
    expect(linkLabel("https://www.example.com/path", "Open")).toBe("example.com");
  });

  it("returns fallback for invalid URL", async () => {
    const { linkLabel } = await import("./directoryUtils");
    expect(linkLabel("not-a-url", "Open")).toBe("Open");
  });

  it("returns empty string for missing URL", async () => {
    const { linkLabel } = await import("./directoryUtils");
    expect(linkLabel("", "Open")).toBe("");
  });
});
