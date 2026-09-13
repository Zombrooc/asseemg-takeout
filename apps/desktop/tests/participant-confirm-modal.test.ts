import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/renderer/src/App.tsx", import.meta.url), "utf8");

describe("desktop participant confirmation modal", () => {
	it("renders complete participant data and third-party fields", () => {
		expect(source).toContain("Data de nascimento");
		expect(source).toContain("Idade");
		expect(source).toContain("Tamanho da camisa");
		expect(source).toContain("Equipe");
		expect(source).toContain("Retirada por terceiros");
		expect(source).toContain("retirada_por_terceiro");
		expect(source).toContain("retirante_nome");
	});
});
