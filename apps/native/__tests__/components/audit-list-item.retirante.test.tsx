import { parseTakeoutRetirantePayload } from "@/lib/takeout-retirante-payload";

describe("audit-list-item retirante payload parsing", () => {
  it("extracts nome and cpf from payload_json", () => {
    const payload = parseTakeoutRetirantePayload(
      '{"retirada_por_terceiro":true,"retirante_nome":"Carlos","retirante_cpf":"123"}'
    );

    expect(payload).toEqual({
      retirada_por_terceiro: true,
      retirante_nome: "Carlos",
      retirante_cpf: "123",
    });
  });

  it("extracts nome and keeps cpf optional", () => {
    const payload = parseTakeoutRetirantePayload(
      '{"retirada_por_terceiro":true,"retirante_nome":"Bianca"}'
    );

    expect(payload).toEqual({
      retirada_por_terceiro: true,
      retirante_nome: "Bianca",
    });
  });

  it("returns null for invalid payload_json", () => {
    expect(parseTakeoutRetirantePayload("{bad-json")).toBeNull();
  });
});

