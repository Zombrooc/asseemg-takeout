import {
  buildTakeoutRetirantePayload,
  buildTakeoutRetirantePayloadJson,
  parseTakeoutRetirantePayload,
} from "@/lib/takeout-retirante-payload";

describe("takeout-retirante-payload", () => {
  it("builds payload json with nome and cpf", () => {
    const payloadJson = buildTakeoutRetirantePayloadJson({
      isProxyTakeout: true,
      retiranteNome: "  Joao da Silva  ",
      retiranteCpf: " 123.456.789-00 ",
    });

    expect(payloadJson).toBe(
      JSON.stringify({
        retirada_por_terceiro: true,
        retirante_nome: "Joao da Silva",
        retirante_cpf: "123.456.789-00",
      })
    );
  });

  it("builds payload with nome and no cpf", () => {
    const payload = buildTakeoutRetirantePayload({
      isProxyTakeout: true,
      retiranteNome: "Maria",
      retiranteCpf: " ",
    });

    expect(payload).toEqual({
      retirada_por_terceiro: true,
      retirante_nome: "Maria",
    });
  });

  it("returns null/undefined when not proxy takeout", () => {
    expect(
      buildTakeoutRetirantePayload({
        isProxyTakeout: false,
        retiranteNome: "Fulano",
        retiranteCpf: "123",
      })
    ).toBeNull();
    expect(
      buildTakeoutRetirantePayloadJson({
        isProxyTakeout: false,
        retiranteNome: "Fulano",
        retiranteCpf: "123",
      })
    ).toBeUndefined();
  });

  it("invalidates blank nome", () => {
    expect(
      buildTakeoutRetirantePayload({
        isProxyTakeout: true,
        retiranteNome: "   ",
        retiranteCpf: "123",
      })
    ).toBeNull();
  });

  it("parses payload json safely", () => {
    expect(
      parseTakeoutRetirantePayload(
        '{"retirada_por_terceiro":true,"retirante_nome":"Ana","retirante_cpf":"999"}'
      )
    ).toEqual({
      retirada_por_terceiro: true,
      retirante_nome: "Ana",
      retirante_cpf: "999",
    });

    expect(parseTakeoutRetirantePayload('{"retirada_por_terceiro":true}')).toBeNull();
    expect(parseTakeoutRetirantePayload("{bad-json")).toBeNull();
  });
});

