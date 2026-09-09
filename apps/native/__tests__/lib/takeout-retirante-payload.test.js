"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var takeout_retirante_payload_1 = require("@/lib/takeout-retirante-payload");
describe("takeout-retirante-payload", function () {
    it("builds payload json with nome and cpf", function () {
        var payloadJson = (0, takeout_retirante_payload_1.buildTakeoutRetirantePayloadJson)({
            isProxyTakeout: true,
            retiranteNome: "  Joao da Silva  ",
            retiranteCpf: " 123.456.789-00 ",
        });
        expect(payloadJson).toBe(JSON.stringify({
            retirada_por_terceiro: true,
            retirante_nome: "Joao da Silva",
            retirante_cpf: "123.456.789-00",
        }));
    });
    it("builds payload with nome and no cpf", function () {
        var payload = (0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
            isProxyTakeout: true,
            retiranteNome: "Maria",
            retiranteCpf: " ",
        });
        expect(payload).toEqual({
            retirada_por_terceiro: true,
            retirante_nome: "Maria",
        });
    });
    it("returns null/undefined when not proxy takeout", function () {
        expect((0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
            isProxyTakeout: false,
            retiranteNome: "Fulano",
            retiranteCpf: "123",
        })).toBeNull();
        expect((0, takeout_retirante_payload_1.buildTakeoutRetirantePayloadJson)({
            isProxyTakeout: false,
            retiranteNome: "Fulano",
            retiranteCpf: "123",
        })).toBeUndefined();
    });
    it("invalidates blank nome", function () {
        expect((0, takeout_retirante_payload_1.buildTakeoutRetirantePayload)({
            isProxyTakeout: true,
            retiranteNome: "   ",
            retiranteCpf: "123",
        })).toBeNull();
    });
    it("parses payload json safely", function () {
        expect((0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)('{"retirada_por_terceiro":true,"retirante_nome":"Ana","retirante_cpf":"999"}')).toEqual({
            retirada_por_terceiro: true,
            retirante_nome: "Ana",
            retirante_cpf: "999",
        });
        expect((0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)('{"retirada_por_terceiro":true}')).toBeNull();
        expect((0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)("{bad-json")).toBeNull();
    });
});
