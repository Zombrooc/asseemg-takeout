import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesPath = resolve(
	import.meta.dirname,
	"../src/renderer/src/styles.css",
);

describe("metric card icons", () => {
	it("keeps the icon wrapper centered instead of overriding it as a block", () => {
		const styles = readFileSync(stylesPath, "utf8");

		expect(styles).toMatch(
			/\.metric-icon\s*\{[^}]*display:\s*grid[^}]*place-items:\s*center/,
		);
		expect(styles).not.toContain(".metric-card span { display: block; }");
	});
});
