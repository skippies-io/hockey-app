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
  });

  it("redirects to /admin/login when not authed", () => {
    renderAt("/admin");
    expect(screen.getByText("LOGIN")).toBeTruthy();
  });

  it("allows access when token exists", () => {
    sessionStorage.setItem("hj_admin_session_token", "token");
    renderAt("/admin");
    expect(screen.getByText("ADMIN OK")).toBeTruthy();
  });
});
