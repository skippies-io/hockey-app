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
