import { describe, expect, it } from "vitest";
import { getEventIdFromPathname } from "../header";

describe("getEventIdFromPathname", () => {
  it("returns the event id for an event detail route", () => {
    expect(getEventIdFromPathname("/events/event-123")).toBe("event-123");
  });

  it("decodes event ids and ignores non-event routes", () => {
    expect(getEventIdFromPathname("/events/event%2F123/participants")).toBe("event/123");
    expect(getEventIdFromPathname("/audit")).toBeUndefined();
  });
});
