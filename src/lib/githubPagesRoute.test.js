import { describe, expect, it } from "vitest";
import { decodeGithubPagesRedirect } from "./githubPagesRoute";

describe("decodeGithubPagesRedirect", () => {
  it("decodes SPA fallback path with token query", () => {
    const out = decodeGithubPagesRedirect("?/admin/login/callback&token=abc");
    expect(out).toBe("admin/login/callback?token=abc");
  });

  it("restores encoded ampersands in query values", () => {
    const out = decodeGithubPagesRedirect("?/admin/login/callback&token=a~and~b");
    expect(out).toBe("admin/login/callback?token=a&b");
  });

  it("preserves hash fragment", () => {
    const out = decodeGithubPagesRedirect("?/admin/login/callback&token=abc", "#x");
    expect(out).toBe("admin/login/callback?token=abc#x");
  });

  it("returns null for regular query strings", () => {
    const out = decodeGithubPagesRedirect("?token=abc");
    expect(out).toBeNull();
  });
});
