/**
 * useThemeColor (heroui-native) can return "invalid" when CSS vars aren't resolved yet.
 * Reanimated and other style processors throw on that. Use this to coerce to a valid color.
 */
export function safeThemeColor(value: string, fallback: string): string {
  if (typeof value !== "string" || !value) return fallback;
  if (value === "invalid" || value.startsWith("var(")) return fallback;
  return value;
}
