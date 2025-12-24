import { describe, it, expect } from "vitest";
import { fixtureSortKey, sortRecent, sortUpcoming } from "./fixtureSort.js";

describe("fixtureSortKey", () => {
  it("returns a numeric key for ISO date and time", () => {
    const key = fixtureSortKey({ date: "2025-02-01", time: "09:30" });
    expect(key).toBe(Date.UTC(2025, 1, 1, 9, 30));
  });

  it("returns a numeric key for ISO date with no time", () => {
    const key = fixtureSortKey({ date: "2025-02-01" });
    expect(key).toBe(Date.UTC(2025, 1, 1, 0, 0));
  });

  it("returns null for invalid inputs", () => {
    expect(fixtureSortKey({ date: "01/02/2025" })).toBe(null);
    expect(fixtureSortKey({ date: "2025-02-01", time: "9:3" })).toBe(null);
    expect(fixtureSortKey({})).toBe(null);
  });
});

describe("sortUpcoming", () => {
  it("sorts by ascending date/time", () => {
    const fixtures = [
      { id: "b", date: "2025-03-02", time: "10:00" },
      { id: "a", date: "2025-03-01", time: "09:00" },
      { id: "c", date: "2025-03-01", time: "11:00" },
    ];

    const result = sortUpcoming(fixtures);
    expect(result.map((f) => f.id)).toEqual(["a", "c", "b"]);
  });

  it("pushes null keys last with stable order", () => {
    const fixtures = [
      { id: "a", date: "2025-03-01", time: "09:00" },
      { id: "b", date: "bad-date" },
      { id: "c", date: "" },
    ];

    const result = sortUpcoming(fixtures);
    expect(result.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps stable order for equal keys", () => {
    const fixtures = [
      { id: "a", date: "2025-03-01", time: "09:00" },
      { id: "b", date: "2025-03-01", time: "09:00" },
    ];

    const result = sortUpcoming(fixtures);
    expect(result.map((f) => f.id)).toEqual(["a", "b"]);
  });
});

describe("sortRecent", () => {
  it("sorts by descending date/time", () => {
    const fixtures = [
      { id: "a", date: "2025-03-01", time: "09:00" },
      { id: "b", date: "2025-03-02", time: "10:00" },
      { id: "c", date: "2025-03-01", time: "11:00" },
    ];

    const result = sortRecent(fixtures);
    expect(result.map((f) => f.id)).toEqual(["b", "c", "a"]);
  });

  it("pushes null keys last with stable order", () => {
    const fixtures = [
      { id: "a", date: "2025-03-01", time: "09:00" },
      { id: "b", date: "bad-date" },
      { id: "c", date: "" },
    ];

    const result = sortRecent(fixtures);
    expect(result.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps stable order for equal keys", () => {
    const fixtures = [
      { id: "a", date: "2025-03-01", time: "09:00" },
      { id: "b", date: "2025-03-01", time: "09:00" },
    ];

    const result = sortRecent(fixtures);
    expect(result.map((f) => f.id)).toEqual(["a", "b"]);
  });
});
