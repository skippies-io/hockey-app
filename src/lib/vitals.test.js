import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import after potential module-level side effects are set up
let vitalsModule;
beforeEach(async () => {
  vi.resetModules();
  vitalsModule = await import("./vitals.js");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("record", () => {
  it("stores a metric in the buffer", () => {
    vitalsModule.record({ name: "LCP", value: 1200 });
    const entries = vitalsModule.getRecentVitals();
    expect(entries.some((e) => e.name === "LCP" && e.value === 1200)).toBe(true);
  });

  it("adds a ts timestamp to each entry", () => {
    vitalsModule.record({ name: "CLS", value: 0.05 });
    const entries = vitalsModule.getRecentVitals();
    const cls = entries.find((e) => e.name === "CLS");
    expect(typeof cls.ts).toBe("number");
    expect(cls.ts).toBeGreaterThan(0);
  });

  it("caps buffer at MAX_ENTRIES (50)", () => {
    for (let i = 0; i < 60; i++) {
      vitalsModule.record({ name: "FCP", value: i });
    }
    expect(vitalsModule.getRecentVitals().length).toBe(50);
  });

  it("returns a copy from getRecentVitals so internal buffer is not mutated", () => {
    vitalsModule.record({ name: "TTFB", value: 80 });
    const snap1 = vitalsModule.getRecentVitals();
    snap1.push({ name: "FAKE", value: 0, ts: 0 });
    const snap2 = vitalsModule.getRecentVitals();
    expect(snap2.some((e) => e.name === "FAKE")).toBe(false);
  });
});

describe("recordApiLatency", () => {
  it("stores an API entry with the given endpoint and duration", () => {
    vitalsModule.recordApiLatency({ endpoint: "/api/fixtures", duration: 42 });
    const entries = vitalsModule.getRecentVitals();
    const hit = entries.find((e) => e.name === "API");
    expect(hit).toBeDefined();
    expect(hit.value).toBe(42);
  });
});

describe("initVitals", () => {
  it("resolves without throwing when window is defined", async () => {
    // window is defined in jsdom; web-vitals dynamic import will fail silently
    await expect(vitalsModule.initVitals()).resolves.toBeUndefined();
  });

  it("hooks up all five web-vitals observers when module loads", async () => {
    const onCLS = vi.fn();
    const onFCP = vi.fn();
    const onINP = vi.fn();
    const onLCP = vi.fn();
    const onTTFB = vi.fn();

    vi.doMock("web-vitals", () => ({ onCLS, onFCP, onINP, onLCP, onTTFB }));
    vi.resetModules();
    const mod = await import("./vitals.js");
    await mod.initVitals();

    expect(onCLS).toHaveBeenCalledWith(mod.record);
    expect(onFCP).toHaveBeenCalledWith(mod.record);
    expect(onINP).toHaveBeenCalledWith(mod.record);
    expect(onLCP).toHaveBeenCalledWith(mod.record);
    expect(onTTFB).toHaveBeenCalledWith(mod.record);
  });

  it("fails silently when web-vitals import throws", async () => {
    vi.doMock("web-vitals", () => { throw new Error("not available"); });
    vi.resetModules();
    const mod = await import("./vitals.js");
    await expect(mod.initVitals()).resolves.toBeUndefined();
  });
});
