/* @vitest-environment node */
import { describe, it, expect } from "vitest";
import config from "../vite.config.js";

describe("vite config base path", () => {
  it("defaults to /hockey-app/ when VITE_BASE_PATH is unset", () => {
    delete process.env.VITE_BASE_PATH;
    const result = config({ mode: "development" });
    expect(result.base).toBe("/hockey-app/");
  });

  it("normalizes a custom VITE_BASE_PATH", () => {
    process.env.VITE_BASE_PATH = "custom-path";
    const result = config({ mode: "development" });
    expect(result.base).toBe("/custom-path/");
  });
});
