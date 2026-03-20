import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DigestPage from "./DigestPage";

vi.mock("../../lib/api", () => ({ API_BASE: "http://localhost:8787/api" }));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem("hj_admin_session_token", "test-token");
  localStorage.setItem("hj_admin_session_expires_at", "2099-01-01T00:00:00.000Z");
});

function renderPage() {
  return render(
    <MemoryRouter>
      <DigestPage />
    </MemoryRouter>
  );
}

// Each item in `bodies` is the JSON the fetch returns; HTTP always 200.
function mockFetch(bodies) {
  let i = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    const body = bodies[i] ?? bodies[bodies.length - 1];
    i++;
    return { ok: true, json: async () => body };
  });
}

const EMPTY_LIST = { ok: true, data: [] };

const SAMPLE_LINKS = {
  ok: true,
  data: [
    {
      id: "link-1",
      tournament_id: "t-1",
      age_id: "U12",
      label: "U12 Parent View",
      created_by: "admin@test.com",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: null,
    },
  ],
};

const REVOKED_LINKS = {
  ok: true,
  data: [
    {
      id: "link-2",
      tournament_id: "t-1",
      age_id: "U9",
      label: null,
      created_by: "admin@test.com",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      revoked_at: new Date().toISOString(),
    },
  ],
};

const EXPIRED_LINKS = {
  ok: true,
  data: [
    {
      id: "link-3",
      tournament_id: "t-2",
      age_id: null,
      label: "Old link",
      created_by: "admin@test.com",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      revoked_at: null,
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Loading ────────────────────────────────────────────────────────────────

describe("DigestPage – loading state", () => {
  it("shows loading text while fetching links", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/Loading/i)).toBeTruthy();
  });
});

// ── Empty state ────────────────────────────────────────────────────────────

describe("DigestPage – empty state", () => {
  it("shows no-links message when list is empty", async () => {
    mockFetch([EMPTY_LIST]);
    renderPage();
    expect(await screen.findByText(/No share links yet/i)).toBeTruthy();
  });
});

// ── Error state ────────────────────────────────────────────────────────────

describe("DigestPage – list error", () => {
  it("shows error message when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    renderPage();
    expect(await screen.findByText(/Network error/i)).toBeTruthy();
  });

  it("shows error when API returns ok:false", async () => {
    mockFetch([{ ok: false, error: "Unauthorized" }]);
    renderPage();
    expect(await screen.findByText("Unauthorized")).toBeTruthy();
  });
});

// ── Link table ─────────────────────────────────────────────────────────────

describe("DigestPage – link table", () => {
  it("renders page heading", async () => {
    mockFetch([EMPTY_LIST]);
    renderPage();
    expect(await screen.findByRole("heading", { name: /Digest Share Links/i })).toBeTruthy();
  });

  it("shows tournament_id for each link", async () => {
    mockFetch([SAMPLE_LINKS]);
    renderPage();
    expect(await screen.findByText("t-1")).toBeTruthy();
  });

  it("shows age_id for each link", async () => {
    mockFetch([SAMPLE_LINKS]);
    renderPage();
    await screen.findByText("t-1");
    expect(screen.getByText("U12")).toBeTruthy();
  });

  it("shows label for each link", async () => {
    mockFetch([SAMPLE_LINKS]);
    renderPage();
    expect(await screen.findByText("U12 Parent View")).toBeTruthy();
  });

  it("shows 'All' when age_id is null", async () => {
    mockFetch([EXPIRED_LINKS]);
    renderPage();
    await screen.findByText("t-2");
    expect(screen.getByText("All")).toBeTruthy();
  });

  it("shows 'Active' status for non-expired, non-revoked link", async () => {
    mockFetch([SAMPLE_LINKS]);
    renderPage();
    expect(await screen.findByText("Active")).toBeTruthy();
  });

  it("shows 'Revoked' status for revoked link", async () => {
    mockFetch([REVOKED_LINKS]);
    renderPage();
    expect(await screen.findByText("Revoked")).toBeTruthy();
  });

  it("shows 'Expired' status for expired link", async () => {
    mockFetch([EXPIRED_LINKS]);
    renderPage();
    expect(await screen.findByText("Expired")).toBeTruthy();
  });

  it("shows Revoke button only for Active links", async () => {
    mockFetch([SAMPLE_LINKS]);
    renderPage();
    await screen.findByText("Active");
    expect(screen.getByRole("button", { name: /Revoke share link link-1/i })).toBeTruthy();
  });

  it("does not show Revoke button for Revoked links", async () => {
    mockFetch([REVOKED_LINKS]);
    renderPage();
    await screen.findByText("Revoked");
    expect(screen.queryByRole("button", { name: /Revoke/i })).toBeNull();
  });

  it("does not show Revoke button for Expired links", async () => {
    mockFetch([EXPIRED_LINKS]);
    renderPage();
    await screen.findByText("Expired");
    expect(screen.queryByRole("button", { name: /Revoke/i })).toBeNull();
  });
});

// ── Revoke ─────────────────────────────────────────────────────────────────

describe("DigestPage – revoke", () => {
  it("calls DELETE and refreshes list when Revoke is clicked", async () => {
    mockFetch([SAMPLE_LINKS, { ok: true }, EMPTY_LIST]);
    renderPage();
    await screen.findByText("Active");
    fireEvent.click(screen.getByRole("button", { name: /Revoke share link link-1/i }));
    await waitFor(() => expect(screen.getByText(/No share links yet/i)).toBeTruthy());
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("id=link-1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("shows alert when revoke fetch rejects", async () => {
    const alertSpy = vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => SAMPLE_LINKS })
      .mockRejectedValueOnce(new Error("Delete failed"));
    renderPage();
    await screen.findByText("Active");
    fireEvent.click(screen.getByRole("button", { name: /Revoke share link link-1/i }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining("Delete failed")));
  });
});

// ── Create form ────────────────────────────────────────────────────────────

describe("DigestPage – create form", () => {
  it("renders the Create New Link form", async () => {
    mockFetch([EMPTY_LIST]);
    renderPage();
    await screen.findByText(/No share links yet/i);
    expect(screen.getByLabelText(/Tournament ID/i)).toBeTruthy();
  });

  it("create button is labelled 'Create share link'", async () => {
    mockFetch([EMPTY_LIST]);
    renderPage();
    await screen.findByText(/No share links yet/i);
    expect(screen.getByRole("button", { name: /Create share link/i })).toBeTruthy();
  });

  it("shows generated share URL after successful create", async () => {
    const fakeToken = "b".repeat(64);
    mockFetch([
      EMPTY_LIST,
      { ok: true, token: fakeToken, expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
      EMPTY_LIST,
    ]);
    renderPage();
    await screen.findByText(/No share links yet/i);

    fireEvent.change(screen.getByLabelText(/Tournament ID/i), {
      target: { value: "my-tournament" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Create share link/i }).closest("form"));

    await screen.findByText(/Copy it now/i);
    expect(screen.getByLabelText("Share URL").value).toContain(fakeToken);
  });

  it("shows error message when create API call returns ok:false", async () => {
    mockFetch([EMPTY_LIST, { ok: false, error: "Missing tournament_id" }]);
    renderPage();
    await screen.findByText(/No share links yet/i);

    fireEvent.change(screen.getByLabelText(/Tournament ID/i), {
      target: { value: "t-x" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Create share link/i }).closest("form"));

    expect(await screen.findByText("Missing tournament_id")).toBeTruthy();
  });

  it("shows error when create fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({ ok: true, json: async () => EMPTY_LIST })
      .mockRejectedValueOnce(new Error("Server down"));
    renderPage();
    await screen.findByText(/No share links yet/i);

    fireEvent.change(screen.getByLabelText(/Tournament ID/i), {
      target: { value: "t-x" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Create share link/i }).closest("form"));

    expect(await screen.findByText("Server down")).toBeTruthy();
  });

  it("updates age_id field on change", async () => {
    mockFetch([EMPTY_LIST]);
    renderPage();
    await screen.findByText(/No share links yet/i);
    const ageInput = screen.getByLabelText(/Age Group/i);
    fireEvent.change(ageInput, { target: { value: "U12" } });
    expect(ageInput.value).toBe("U12");
  });

  it("updates label field on change", async () => {
    mockFetch([EMPTY_LIST]);
    renderPage();
    await screen.findByText(/No share links yet/i);
    const labelInput = screen.getByLabelText(/Label/i);
    fireEvent.change(labelInput, { target: { value: "Parent View" } });
    expect(labelInput.value).toBe("Parent View");
  });

  it("clicking share URL input selects the text", async () => {
    const fakeToken = "d".repeat(64);
    mockFetch([
      EMPTY_LIST,
      { ok: true, token: fakeToken, expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() },
      EMPTY_LIST,
    ]);
    renderPage();
    await screen.findByText(/No share links yet/i);
    fireEvent.change(screen.getByLabelText(/Tournament ID/i), { target: { value: "t-1" } });
    fireEvent.submit(screen.getByRole("button", { name: /Create share link/i }).closest("form"));
    await screen.findByText(/Copy it now/i);
    const urlInput = screen.getByLabelText("Share URL");
    const selectSpy = vi.spyOn(urlInput, "select");
    fireEvent.click(urlInput);
    expect(selectSpy).toHaveBeenCalled();
  });

  it("clears form fields after successful create", async () => {
    const fakeToken = "c".repeat(64);
    mockFetch([
      EMPTY_LIST,
      { ok: true, token: fakeToken, expires_at: new Date().toISOString() },
      EMPTY_LIST,
    ]);
    renderPage();
    await screen.findByText(/No share links yet/i);

    const tournamentInput = screen.getByLabelText(/Tournament ID/i);
    fireEvent.change(tournamentInput, { target: { value: "my-tournament" } });
    fireEvent.submit(tournamentInput.closest("form"));

    await screen.findByText(/Copy it now/i);
    expect(tournamentInput.value).toBe("");
  });

  it("shows error when POST response has no error field", async () => {
    mockFetch([EMPTY_LIST, { ok: false }]); // no error field in the failure response
    renderPage();
    await screen.findByText(/No share links yet/i);

    const tournamentInput = screen.getByLabelText(/Tournament ID/i);
    fireEvent.change(tournamentInput, { target: { value: "my-tournament" } });
    fireEvent.submit(tournamentInput.closest("form"));

    await waitFor(() => expect(screen.getByText("Failed")).toBeTruthy());
  });

  it("uses empty Authorization header when no admin token", async () => {
    localStorage.removeItem("hj_admin_session_token");
    localStorage.removeItem("hj_admin_session_expires_at");
    renderPage();
    expect(await screen.findByText(/Admin session expired. Please sign in again./i)).toBeTruthy();
  });

  it("formatExpiry returns raw iso string when toLocaleDateString throws", async () => {
    const iso = new Date().toISOString();
    mockFetch([{
      ok: true,
      data: [{ id: "x1", tournament_id: "t-1", age_id: "U12", label: "Test",
               expires_at: iso, revoked_at: null }],
    }]);

    const spy = vi.spyOn(Date.prototype, "toLocaleDateString").mockImplementationOnce(() => {
      throw new Error("Locale not supported");
    });

    renderPage();
    // The raw ISO string should appear as the expiry text (fallback)
    await waitFor(() => expect(screen.getByText(iso)).toBeTruthy());
    spy.mockRestore();
  });
});
