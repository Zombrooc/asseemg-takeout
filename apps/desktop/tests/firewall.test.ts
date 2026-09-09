import { describe, expect, it } from "vitest";
import { allowFirewall, getFirewallStatus } from "../src/main/firewall";

describe("firewall integration", () => {
  it("does not run Windows commands on unsupported platforms", async () => {
    if (process.platform === "win32") return;
    await expect(getFirewallStatus()).resolves.toMatchObject({ supported: false, allowed: true, port: 5555 });
    await expect(allowFirewall()).resolves.toMatchObject({ supported: false, allowed: true, port: 5555 });
  });
});
