import { describe, expect, it } from "vitest";
import { rendererContentSecurityPolicy } from "../src/main/csp";

describe("renderer content security policy", () => {
	it("allows the local Vite renderer in development", () => {
		const policy = rendererContentSecurityPolicy(false);

		expect(policy).toContain(
			"script-src 'self' 'unsafe-inline' http://localhost:* http://127.0.0.1:*",
		);
	});

	it("keeps packaged renderer scripts restricted to file resources", () => {
		const policy = rendererContentSecurityPolicy(true);

		expect(policy).toContain("script-src 'self'");
		expect(policy).not.toContain("http://localhost:*");
		expect(policy).not.toContain("http://127.0.0.1:*");
	});
});
