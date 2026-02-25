/**
 * Invariants: mobile-tamagui constants and contracts (no JSX/RN import to avoid Jest transform issues).
 */
import {
  PAIRING_METHODS,
  STATUS_PILL_LABELS,
  type PairingMethod,
} from "@/components/mobile-tamagui/constants";

describe("mobile-tamagui invariants", () => {
  describe("PAIRING_METHODS", () => {
    it("has qr and manual", () => {
      expect(PAIRING_METHODS).toContain("qr");
      expect(PAIRING_METHODS).toContain("manual");
      expect(PAIRING_METHODS).toHaveLength(2);
    });

    it("PairingMethod type is qr | manual", () => {
      const methods: PairingMethod[] = [...PAIRING_METHODS];
      expect(methods).toEqual(["qr", "manual"]);
    });
  });

  describe("STATUS_PILL_LABELS", () => {
    it("has live and offline labels", () => {
      expect(STATUS_PILL_LABELS.live).toBe("LIVE");
      expect(STATUS_PILL_LABELS.offline).toBe("OFFLINE");
    });
  });
});
