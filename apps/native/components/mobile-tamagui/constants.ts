/**
 * Constants for mobile-tamagui. Used by tests and components.
 */
export const PAIRING_METHODS = ["qr", "manual"] as const;
export type PairingMethod = (typeof PAIRING_METHODS)[number];

export const STATUS_PILL_LABELS = { live: "LIVE", offline: "OFFLINE" } as const;
