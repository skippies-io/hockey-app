import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Help from "./Help";

describe("Help page", () => {
  it("renders the page heading", () => {
    render(<Help />);
    expect(screen.getByRole("heading", { name: /User Guide/i })).toBeTruthy();
  });

  it("renders all section headings", () => {
    render(<Help />);
    expect(screen.getByRole("heading", { name: /Viewing Fixtures/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Standings/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Following Teams/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Awards/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Adding Fixtures to Your Calendar/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Digest Share Links/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Switching Tournaments/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Installing the App/i })).toBeTruthy();
  });

  it("has aria-labelledby pointing to the page heading", () => {
    const { container } = render(<Help />);
    const root = container.querySelector('[aria-labelledby="help-heading"]');
    expect(root).toBeTruthy();
  });

  it("renders fixture instructions body text", () => {
    render(<Help />);
    expect(screen.getByText(/Age.*dropdown/i)).toBeTruthy();
  });

  it("renders standings body text", () => {
    render(<Help />);
    expect(screen.getByText(/Goals For/i)).toBeTruthy();
  });

  it("renders follow teams body text", () => {
    render(<Help />);
    expect(screen.getByText(/saved on your device/i)).toBeTruthy();
  });

  it("renders calendar body text", () => {
    render(<Help />);
    expect(screen.getByText(/\.ics file/i)).toBeTruthy();
  });

  it("renders digest body text", () => {
    render(<Help />);
    expect(screen.getByText(/No login is required/i)).toBeTruthy();
  });

  it("renders install instructions for Android and iPhone", () => {
    render(<Help />);
    expect(screen.getByText(/Android \/ Chrome/i)).toBeTruthy();
    expect(screen.getByText(/iPhone \/ Safari/i)).toBeTruthy();
  });
});
