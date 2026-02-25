/**
 * Invariants: Tamagui config must expose V0 semantic tokens for light and dark themes.
 * Required for mobile-tamagui and ui-tamagui components.
 */
import { config } from "@/tamagui.config";

const REQUIRED_TOKEN_KEYS = [
  "background",
  "foreground",
  "muted",
  "card",
  "border",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
  "overlay",
] as const;

describe("Tamagui config tokens", () => {
  it("exposes light theme with all required semantic tokens", () => {
    const light = config.themes?.light;
    expect(light).toBeDefined();
    REQUIRED_TOKEN_KEYS.forEach((key) => {
      expect(light![key]).toBeDefined();
      const t = typeof light![key];
      expect(["string", "object"].includes(t)).toBe(true);
    });
  });

  it("exposes dark theme with all required semantic tokens", () => {
    const dark = config.themes?.dark;
    expect(dark).toBeDefined();
    REQUIRED_TOKEN_KEYS.forEach((key) => {
      expect(dark![key]).toBeDefined();
      const t = typeof dark![key];
      expect(["string", "object"].includes(t)).toBe(true);
    });
  });

  it("light and dark themes have background defined", () => {
    expect(config.themes?.light?.background).toBeDefined();
    expect(config.themes?.dark?.background).toBeDefined();
  });
});
