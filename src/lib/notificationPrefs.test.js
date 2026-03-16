import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

const DISMISSED_KEY = "hj_dismissed_announcements";

function clearStorage() {
  localStorage.removeItem(DISMISSED_KEY);
}

describe("notificationPrefs", () => {
  beforeEach(() => {
    clearStorage();
    vi.resetModules();
  });

  async function getModule() {
    return import("./notificationPrefs.js");
  }

  it("readDismissed returns empty set when storage is empty", async () => {
    const { readDismissed } = await getModule();
    expect(readDismissed().size).toBe(0);
  });

  it("dismissNotification adds id to localStorage", async () => {
    const { dismissNotification, readDismissed } = await getModule();
    dismissNotification("ann-1");
    expect(readDismissed().has("ann-1")).toBe(true);
  });

  it("dismissNotification dispatches hj:notifications event", async () => {
    const { dismissNotification } = await getModule();
    const spy = vi.fn();
    window.addEventListener("hj:notifications", spy);
    dismissNotification("ann-2");
    window.removeEventListener("hj:notifications", spy);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("isDismissed returns false for unknown id", async () => {
    const { isDismissed } = await getModule();
    expect(isDismissed("unknown")).toBe(false);
  });

  it("isDismissed returns true after dismiss", async () => {
    const { dismissNotification, isDismissed } = await getModule();
    dismissNotification("ann-3");
    expect(isDismissed("ann-3")).toBe(true);
  });

  it("readDismissed handles corrupted localStorage gracefully", async () => {
    localStorage.setItem(DISMISSED_KEY, "not-json{{");
    const { readDismissed } = await getModule();
    expect(readDismissed().size).toBe(0);
  });

  it("useNotificationPrefs returns correct unreadCount", async () => {
    const { useNotificationPrefs } = await getModule();
    const announcements = [
      { id: "a1", title: "T1", body: "B1", severity: "info" },
      { id: "a2", title: "T2", body: "B2", severity: "warning" },
    ];
    const { result } = renderHook(() => useNotificationPrefs(announcements));
    expect(result.current.unreadCount).toBe(2);
  });

  it("useNotificationPrefs unreadCount decreases after dismiss", async () => {
    const { useNotificationPrefs, dismissNotification } = await getModule();
    const announcements = [
      { id: "b1", title: "T1", body: "B1", severity: "info" },
      { id: "b2", title: "T2", body: "B2", severity: "alert" },
    ];
    const { result } = renderHook(() => useNotificationPrefs(announcements));
    expect(result.current.unreadCount).toBe(2);

    act(() => {
      dismissNotification("b1");
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it("useNotificationPrefs isDismissed reflects current state", async () => {
    const { useNotificationPrefs, dismissNotification } = await getModule();
    const announcements = [{ id: "c1", title: "T", body: "B", severity: "success" }];
    const { result } = renderHook(() => useNotificationPrefs(announcements));
    expect(result.current.isDismissed("c1")).toBe(false);

    act(() => {
      dismissNotification("c1");
    });
    expect(result.current.isDismissed("c1")).toBe(true);
  });
});
