import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminLogin from "./AdminLogin.jsx";

vi.mock("../../lib/adminAuth", () => ({
  requestMagicLink: vi.fn(async () => ({ ok: true })),
}));

import { requestMagicLink } from "../../lib/adminAuth";

describe("AdminLogin", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("submits email and shows success message", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/login?next=%2Fadmin"]}>
        <AdminLogin />
      </MemoryRouter>
    );

    const input = screen.getByLabelText("Email");
    fireEvent.change(input, { target: { value: "test@example.com" } });

    const btn = screen.getByRole("button", { name: "Send sign-in link" });
    fireEvent.click(btn);

    await waitFor(() => expect(requestMagicLink).toHaveBeenCalledWith("test@example.com"));
    expect(screen.getByText(/Check your email/i)).toBeTruthy();
  });

  it("shows error when request fails", async () => {
    requestMagicLink.mockRejectedValueOnce(new Error("boom"));

    render(
      <MemoryRouter initialEntries={["/admin/login"]}>
        <AdminLogin />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send sign-in link" }));

    await waitFor(() => expect(screen.getByText("boom")).toBeTruthy());
  });
});
