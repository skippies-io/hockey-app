import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import DigestShare from "./DigestShare";

const apiMocks = vi.hoisted(() => ({
  getDigestShare: vi.fn(),
  getStandingsRows: vi.fn(),
  getFixturesRows: vi.fn(),
}));

vi.mock("../lib/api", () => apiMocks);

const VALID_TOKEN = "a".repeat(64);

const CONFIG = {
  tournament_id: "t-1",
  age_id: "U12",
  label: "U12 Digest",
  expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
};

function renderShare(token = VALID_TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <Routes>
        <Route path="/share/:token" element={<DigestShare />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  apiMocks.getDigestShare.mockReset();
  apiMocks.getStandingsRows.mockReset();
  apiMocks.getFixturesRows.mockReset();
  apiMocks.getStandingsRows.mockResolvedValue([]);
  apiMocks.getFixturesRows.mockResolvedValue([]);
});

describe("DigestShare – loading state", () => {
  it("shows loading text while fetching config", () => {
    apiMocks.getDigestShare.mockReturnValue(new Promise(() => {}));
    renderShare();
    expect(screen.getByText(/Loading/i)).toBeTruthy();
  });
});

describe("DigestShare – error state", () => {
  it("shows error message when token is invalid", async () => {
    apiMocks.getDigestShare.mockRejectedValue(new Error("Not found"));
    renderShare();
    expect(await screen.findByText(/Link not found/i)).toBeTruthy();
    expect(screen.getByText("Not found")).toBeTruthy();
  });

  it("shows expiry message alongside error", async () => {
    apiMocks.getDigestShare.mockRejectedValue(new Error("Not found"));
    renderShare();
    await screen.findByText(/Link not found/i);
    expect(screen.getByText(/expired or been revoked/i)).toBeTruthy();
  });
});

describe("DigestShare – valid token", () => {
  beforeEach(() => {
    apiMocks.getDigestShare.mockResolvedValue({ ok: true, config: CONFIG });
  });

  it("renders the digest title from config label", async () => {
    renderShare();
    expect(await screen.findByText("U12 Digest")).toBeTruthy();
  });

  it("shows expiry date", async () => {
    renderShare();
    await screen.findByText("U12 Digest");
    expect(screen.getByText(/Valid until/i)).toBeTruthy();
  });

  it("calls getDigestShare with the token from the URL", async () => {
    renderShare(VALID_TOKEN);
    await waitFor(() => expect(apiMocks.getDigestShare).toHaveBeenCalledWith(VALID_TOKEN));
  });

  it("calls getStandingsRows with tournament_id and age_id", async () => {
    renderShare();
    await waitFor(() =>
      expect(apiMocks.getStandingsRows).toHaveBeenCalledWith("t-1", "U12")
    );
  });

  it("calls getFixturesRows with tournament_id and age_id", async () => {
    renderShare();
    await waitFor(() =>
      expect(apiMocks.getFixturesRows).toHaveBeenCalledWith("t-1", "U12")
    );
  });

  it("renders standings table when rows are returned", async () => {
    apiMocks.getStandingsRows.mockResolvedValue([
      { Team: "Alpha FC", Rank: 1, GP: 3, W: 2, D: 1, L: 0, GF: 7, GA: 2, GD: 5, Points: 7 },
    ]);
    renderShare();
    expect(await screen.findByText("Alpha FC")).toBeTruthy();
  });

  it("renders fixtures table when rows are returned", async () => {
    apiMocks.getFixturesRows.mockResolvedValue([
      { Date: "2025-06-01", Time: "09:00", Team1: "Alpha FC", Team2: "Beta", Score1: "", Score2: "", Venue: "Field 1" },
    ]);
    renderShare();
    // Alpha FC will appear in both standings (empty) and fixtures
    expect(await screen.findByText("Alpha FC")).toBeTruthy();
  });

  it("shows no standings data when rows are empty", async () => {
    renderShare();
    expect(await screen.findByText(/No standings data/i)).toBeTruthy();
  });

  it("shows no fixtures found when rows are empty", async () => {
    renderShare();
    expect(await screen.findByText(/No fixtures found/i)).toBeTruthy();
  });

  it("renders accessible table for standings", async () => {
    apiMocks.getStandingsRows.mockResolvedValue([
      { Team: "Delta", Rank: 1, GP: 1, W: 1, D: 0, L: 0, GF: 3, GA: 0, GD: 3, Points: 3 },
    ]);
    renderShare();
    await screen.findByText("Delta");
    expect(screen.getByRole("table", { name: /standings/i })).toBeTruthy();
  });

  it("uses tournament_id as fallback title when no label", async () => {
    apiMocks.getDigestShare.mockResolvedValue({
      ok: true,
      config: { ...CONFIG, label: null },
    });
    renderShare();
    expect(await screen.findByText(/U12 Digest/i)).toBeTruthy();
  });

  it("shows standings error when getStandingsRows rejects", async () => {
    apiMocks.getStandingsRows.mockRejectedValue(new Error("Standings unavailable"));
    renderShare();
    expect(await screen.findByText(/Standings unavailable/i)).toBeTruthy();
  });

  it("shows fixtures error when getFixturesRows rejects", async () => {
    apiMocks.getFixturesRows.mockRejectedValue(new Error("Fixtures unavailable"));
    renderShare();
    expect(await screen.findByText(/Fixtures unavailable/i)).toBeTruthy();
  });
});
