import {
  BADGE_STATUS_CLASS,
  CONNECTION_BG_CLASS,
  STATUS_PILL_CLASS,
  type BadgeStatusVariant,
  type ConnectionBgVariant,
  type StatusPillVariant,
} from "@/utils/theme-tokens";

describe("theme-tokens", () => {
  describe("STATUS_PILL_CLASS", () => {
    it("has online and offline variants with static classes", () => {
      expect(STATUS_PILL_CLASS.online).toBe("bg-success/20 border-success");
      expect(STATUS_PILL_CLASS.offline).toBe("bg-danger/20 border-danger");
    });

    it("all keys are valid StatusPillVariant", () => {
      const keys: StatusPillVariant[] = ["online", "offline"];
      keys.forEach((k) => {
        expect(STATUS_PILL_CLASS[k]).toBeDefined();
        expect(typeof STATUS_PILL_CLASS[k]).toBe("string");
      });
    });
  });

  describe("CONNECTION_BG_CLASS", () => {
    it("has reachable, unreachable, loading variants", () => {
      expect(CONNECTION_BG_CLASS.reachable).toBe("bg-success/10");
      expect(CONNECTION_BG_CLASS.unreachable).toBe("bg-danger/10");
      expect(CONNECTION_BG_CLASS.loading).toBe("bg-muted/10");
    });

    it("all keys are valid ConnectionBgVariant", () => {
      const keys: ConnectionBgVariant[] = ["reachable", "unreachable", "loading"];
      keys.forEach((k) => {
        expect(CONNECTION_BG_CLASS[k]).toBeDefined();
      });
    });
  });

  describe("BADGE_STATUS_CLASS", () => {
    it("has confirmed, duplicate, failed, pending with static classes", () => {
      expect(BADGE_STATUS_CLASS.confirmed).toContain("success");
      expect(BADGE_STATUS_CLASS.duplicate).toContain("warning");
      expect(BADGE_STATUS_CLASS.failed).toContain("danger");
      expect(BADGE_STATUS_CLASS.pending).toContain("muted");
    });

    it("all keys are valid BadgeStatusVariant", () => {
      const keys: BadgeStatusVariant[] = ["confirmed", "duplicate", "failed", "pending"];
      keys.forEach((k) => {
        expect(BADGE_STATUS_CLASS[k]).toBeDefined();
        expect(typeof BADGE_STATUS_CLASS[k]).toBe("string");
      });
    });
  });
});
