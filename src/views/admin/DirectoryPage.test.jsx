import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DirectoryPage from "./DirectoryPage";

const fields = [
  { key: "name", label: "Name", placeholder: "Name", id: "name" },
];

const columns = [
  { key: "name", label: "Name", editable: true },
];

function renderPage(overrides = {}) {
  const defaults = {
    title: "Items",
    subtitle: "Manage items",
    addTitle: "Add Item",
    listTitle: "Item List",
    emptyMessage: "No items",
    confirmDeleteMessage: "Delete item?",
    fields,
    columns,
    sortItems: (a, b) => a.name.localeCompare(b.name),
    getInitialForm: () => ({ name: "" }),
    buildEditData: (item) => ({ name: item.name || "" }),
    validateCreate: (form) => (!form.name ? "Name required" : ""),
    validateEdit: (form) => (!form.name ? "Name required" : ""),
    getListUrl: () => "http://localhost:8787/api/admin/items",
    getCreateRequest: (form) => ({
      url: "http://localhost:8787/api/admin/items",
      options: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
    }),
    getUpdateRequest: (item, form) => ({
      url: `http://localhost:8787/api/admin/items/${item.id}`,
      options: { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
    }),
    getDeleteRequest: (item) => ({
      url: `http://localhost:8787/api/admin/items/${item.id}`,
      options: { method: "DELETE" },
    }),
    rowKey: (item) => item.id,
  };
  return render(<DirectoryPage {...defaults} {...overrides} />);
}

describe("DirectoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn((url, options = {}) => {
      const method = options.method || "GET";
      if (method === "GET") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, data: [{ id: "1", name: "Alpha" }] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    });
    window.confirm = vi.fn(() => true);
  });

  it("renders list items", async () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeDefined();
    });
  });

  it("shows error when list request fails", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ ok: false, error: "Load failed" }),
      })
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/load failed/i)).toBeDefined();
    });
  });

  it("validates create form", async () => {
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /add item/i }));
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(screen.getByText("Name required")).toBeDefined();
  });

  it("creates, edits, and deletes items", async () => {
    renderPage();
    await waitFor(() => screen.getByLabelText("Name"));

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Beta" } });
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/items",
        expect.objectContaining({ method: "POST" })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByDisplayValue("Alpha"), { target: { value: "Alpha Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/items/1",
        expect.objectContaining({ method: "PUT" })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8787/api/admin/items/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
