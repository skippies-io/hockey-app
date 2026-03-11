import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLoginCallback from "./AdminLoginCallback.jsx";

vi.mock("../../lib/adminAuth", () => ({
  setAdminSession: vi.fn(),
  verifyMagicToken: vi.fn(async () => ({
    ok: true,
    token: "sessiontoken",
    email: "admin@example.com",
    expiresAt: "2099-01-01T00:00:00Z",
  })),
}));

import { setAdminSession } from "../../lib/adminAuth";

describe("AdminLoginCallback", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("verifies token, stores session, and redirects", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/login/callback?token=magic&next=%2Fadmin"]}>
        <Routes>
          <Route path="/admin/login/callback" element={<AdminLoginCallback />} />
          <Route path="/admin" element={<div>ADMIN</div>} />
        </Routes>
      </MemoryRouter>
    );

    // initial loading
    expect(screen.getByText(/Signing you in/i)).toBeTruthy();

    // allow effect to run
    await new Promise((r) => setTimeout(r, 0));

    expect(setAdminSession).toHaveBeenCalledWith({
      token: "sessiontoken",
      email: "admin@example.com",
      expiresAt: "2099-01-01T00:00:00Z",
    });
  });
});
