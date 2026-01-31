import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FilterBar from "./FilterBar";

describe("FilterBar", () => {
  it("renders with default props", () => {
    render(<FilterBar />);
    expect(screen.getByRole("checkbox")).toBeTruthy();
  });

  it("shows favourites count", () => {
    render(<FilterBar favouritesCount={5} />);
    expect(screen.getByText("Show only followed teams (5)")).toBeTruthy();
  });
});