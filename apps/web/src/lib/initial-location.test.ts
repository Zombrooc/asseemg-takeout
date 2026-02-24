import { describe, expect, it, vi } from "vitest";
import { getNormalizedInitialPath, normalizeInitialLocation } from "./initial-location";

describe("getNormalizedInitialPath", () => {
  it("normalizes file protocol to root route", () => {
    expect(
      getNormalizedInitialPath({
        protocol: "file:",
        pathname: "/C:/Program Files/ASSEEMG/index.html",
        search: "?foo=1",
        hash: "#bar",
      })
    ).toBe("/?foo=1#bar");
  });

  it("normalizes /index.html in http(s)", () => {
    expect(
      getNormalizedInitialPath({
        protocol: "https:",
        pathname: "/index.html",
        search: "",
        hash: "",
      })
    ).toBe("/");
  });

  it("returns null when no normalization is needed", () => {
    expect(
      getNormalizedInitialPath({
        protocol: "https:",
        pathname: "/audit",
        search: "",
        hash: "",
      })
    ).toBeNull();
  });
});

describe("normalizeInitialLocation", () => {
  it("calls replaceState with normalized path", () => {
    const replaceState = vi.fn();
    normalizeInitialLocation(
      {
        protocol: "https:",
        pathname: "/index.html",
        search: "?token=abc",
        hash: "#section",
      },
      replaceState
    );
    expect(replaceState).toHaveBeenCalledWith(null, "", "/?token=abc#section");
  });

  it("does not call replaceState when path is already valid", () => {
    const replaceState = vi.fn();
    normalizeInitialLocation(
      {
        protocol: "https:",
        pathname: "/",
        search: "",
        hash: "",
      },
      replaceState
    );
    expect(replaceState).not.toHaveBeenCalled();
  });
});
