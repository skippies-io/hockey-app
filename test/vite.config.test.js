/* @vitest-environment node */
import { describe, it, expect } from "vitest";

async function loadConfig() {
  const moduleUrl = new URL(
    `../vite.config.js?vitest=${Date.now()}`,
    import.meta.url
  );
  const { default: config } = await import(moduleUrl.href);
  return config;
}

describe("vite config base path", () => {
  it("defaults to /hockey-app/ when VITE_BASE_PATH is unset", () => {
    delete process.env.VITE_BASE_PATH;
    return loadConfig().then((config) => {
      const result = config({ mode: "development" });
      expect(result.base).toBe("/hockey-app/");
    });
  });

  it("normalizes a custom VITE_BASE_PATH", () => {
    process.env.VITE_BASE_PATH = "custom-path";
    return loadConfig().then((config) => {
      const result = config({ mode: "development" });
      expect(result.base).toBe("/custom-path/");
    });
  });
});

describe("vite config manualChunks", () => {
  async function getManualChunks() {
    delete process.env.VITE_BASE_PATH;
    const mod = await loadConfig();
    const result = mod({ mode: "production" });
    return result.build.rollupOptions.output.manualChunks;
  }

  it("returns undefined for non-node_modules paths", async () => {
    const fn = await getManualChunks();
    expect(fn("/Users/dev/src/components/App.jsx")).toBeUndefined();
  });

  it("assigns react-dom to vendor-react chunk", async () => {
    const fn = await getManualChunks();
    expect(fn("/node_modules/react-dom/index.js")).toBe("vendor-react");
  });

  it("assigns react-router to vendor-router chunk", async () => {
    const fn = await getManualChunks();
    expect(fn("/node_modules/react-router/index.js")).toBe("vendor-router");
  });

  it("assigns react (not react-dom/react-router) to vendor-react chunk", async () => {
    const fn = await getManualChunks();
    expect(fn("/node_modules/react/index.js")).toBe("vendor-react");
  });

  it("returns undefined for other node_modules", async () => {
    const fn = await getManualChunks();
    expect(fn("/node_modules/lodash/lodash.js")).toBeUndefined();
  });
});
