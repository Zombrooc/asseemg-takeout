"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTakeoutRetirantePayload = buildTakeoutRetirantePayload;
exports.buildTakeoutRetirantePayloadJson = buildTakeoutRetirantePayloadJson;
exports.parseTakeoutRetirantePayload = parseTakeoutRetirantePayload;
function buildTakeoutRetirantePayload(input) {
    var _a;
    if (!input.isProxyTakeout)
        return null;
    var nome = input.retiranteNome.trim();
    if (!nome)
        return null;
    var cpf = ((_a = input.retiranteCpf) !== null && _a !== void 0 ? _a : "").trim();
    if (!cpf) {
        return {
            retirada_por_terceiro: true,
            retirante_nome: nome,
        };
    }
    return {
        retirada_por_terceiro: true,
        retirante_nome: nome,
        retirante_cpf: cpf,
    };
}
function buildTakeoutRetirantePayloadJson(input) {
    var payload = buildTakeoutRetirantePayload(input);
    if (!payload)
        return undefined;
    return JSON.stringify(payload);
}
function parseTakeoutRetirantePayload(payloadJson) {
    if (!payloadJson)
        return null;
    try {
        var parsed = JSON.parse(payloadJson);
        if (parsed.retirada_por_terceiro !== true)
            return null;
        if (typeof parsed.retirante_nome !== "string")
            return null;
        var nome = parsed.retirante_nome.trim();
        if (!nome)
            return null;
        var cpf = typeof parsed.retirante_cpf === "string"
            ? parsed.retirante_cpf.trim()
            : "";
        if (!cpf) {
            return {
                retirada_por_terceiro: true,
                retirante_nome: nome,
            };
        }
        return {
            retirada_por_terceiro: true,
            retirante_nome: nome,
            retirante_cpf: cpf,
        };
    }
    catch (_a) {
        return null;
    }
}
