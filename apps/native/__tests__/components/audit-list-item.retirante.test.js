"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var takeout_retirante_payload_1 = require("@/lib/takeout-retirante-payload");
describe("audit-list-item retirante payload parsing", function () {
    it("extracts nome and cpf from payload_json", function () {
        var payload = (0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)('{"retirada_por_terceiro":true,"retirante_nome":"Carlos","retirante_cpf":"123"}');
        expect(payload).toEqual({
            retirada_por_terceiro: true,
            retirante_nome: "Carlos",
            retirante_cpf: "123",
        });
    });
    it("extracts nome and keeps cpf optional", function () {
        var payload = (0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)('{"retirada_por_terceiro":true,"retirante_nome":"Bianca"}');
        expect(payload).toEqual({
            retirada_por_terceiro: true,
            retirante_nome: "Bianca",
        });
    });
    it("returns null for invalid payload_json", function () {
        expect((0, takeout_retirante_payload_1.parseTakeoutRetirantePayload)("{bad-json")).toBeNull();
    });
});
