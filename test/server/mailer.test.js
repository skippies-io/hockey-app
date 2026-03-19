import { describe, expect, it } from "vitest";
import { buildMagicLink, resolveAppUrl } from "../../server/mailer.mjs";

describe("mailer URL resolution", () => {
  it("uses APP_URL when provided", () => {
    expect(resolveAppUrl({ APP_URL: "https://example.com/app" })).toBe("https://example.com/app");
  });

  it("trims trailing slash from APP_URL", () => {
    expect(resolveAppUrl({ APP_URL: "https://example.com/app/" })).toBe("https://example.com/app");
  });

  it("uses localhost in development", () => {
    expect(resolveAppUrl({ NODE_ENV: "development" })).toBe("http://localhost:5173");
  });

  it("uses localhost in test", () => {
    expect(resolveAppUrl({ NODE_ENV: "test" })).toBe("http://localhost:5173");
  });

  it("uses production frontend default when APP_URL is missing", () => {
    expect(resolveAppUrl({ NODE_ENV: "production" })).toBe("https://skippies-io.github.io/hockey-app");
  });
});

describe("buildMagicLink", () => {
  it("builds callback URL with token", () => {
    const link = buildMagicLink("abc123", { APP_URL: "https://example.com/app" });
    expect(link).toBe("https://example.com/app/admin/login/callback?token=abc123");
  });
});
