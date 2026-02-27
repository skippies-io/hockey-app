import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import Feedback from "./Feedback";
import { sendFeedback } from "../lib/api";

// --- mocks ---
vi.mock("../lib/api", () => ({
  sendFeedback: vi.fn(),
}));

let mockNavigate;
let mockParams;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:ageId/feedback" element={<Feedback />} />
        <Route path="/feedback" element={<Feedback />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Feedback view", () => {
  beforeEach(() => {
    mockNavigate = vi.fn();
    mockParams = { ageId: "u12" };
    vi.clearAllMocks();
    sendFeedback.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("validates message, submits successfully, then shows thanks + back navigation", async () => {
    sendFeedback.mockResolvedValueOnce(undefined);

    window.history.pushState({}, "", "/u12/feedback?x=1#hash");
    const { container } = renderAt("/u12/feedback?x=1#hash");
    const form = container.querySelector("form");

    // empty submit => error
    fireEvent.submit(form);
    const emptyAlert = await screen.findByRole("alert");
    expect(emptyAlert.textContent).toContain("Error: Please enter your message.");

    // fill out + submit => calls API, shows thanks
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Skippies" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "skippies@example.com" } });
    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: "Hello there" } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(sendFeedback).toHaveBeenCalledTimes(1);
    });

    // route should be built from location bits
    const payload = sendFeedback.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: "Skippies",
      email: "skippies@example.com",
      message: "Hello there",
      ageId: "u12",
    });
    expect(payload.route).toContain("/u12/feedback");
    expect(payload.route).toContain("?x=1");
    expect(payload.route).toContain("#hash");

    expect(await screen.findByText(/thanks/i)).toBeTruthy();

    // Back button navigates to standings for age
    fireEvent.click(screen.getByRole("button", { name: /back to u12 standings/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/u12/standings");
  });

  it("handles API error and allows cancel navigation (no ageId goes home)", async () => {
    mockParams = {}; // no ageId
    sendFeedback.mockRejectedValueOnce(new Error("Boom"));

    window.history.pushState({}, "", "/feedback");
    const { container } = renderAt("/feedback");
    const form = container.querySelector("form");

    fireEvent.change(screen.getByLabelText(/^message$/i), { target: { value: "Something broke" } });
    fireEvent.submit(form);

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert.textContent).toContain("Error: Boom");

    // cancel goes home when no ageId
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
