import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminRoute from "./AdminRoute.jsx";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<div>ADMIN OK</div>} />
        </Route>
        <Route path="/admin/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("redirects to /admin/login when not authed", () => {
    renderAt("/admin");
    expect(screen.getByText("LOGIN")).toBeTruthy();
  });

  it("allows access when token exists", () => {
    localStorage.setItem("hj_admin_session_token", "token");
    localStorage.setItem("hj_admin_session_expires_at", "2099-01-01T00:00:00.000Z");
    renderAt("/admin");
    expect(screen.getByText("ADMIN OK")).toBeTruthy();
  });

  it("redirects to /admin/login when session is expired", () => {
    localStorage.setItem("hj_admin_session_token", "token");
    localStorage.setItem("hj_admin_session_expires_at", "2000-01-01T00:00:00.000Z");
    renderAt("/admin");
    expect(screen.getByText("LOGIN")).toBeTruthy();
  });
});
