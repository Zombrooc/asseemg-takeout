"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAuditRetirantePayload = parseAuditRetirantePayload;
exports.buildAuditCsv = buildAuditCsv;
function parseAuditRetirantePayload(payloadJson) {
    if (!payloadJson) {
        return {
            retiradaPorTerceiro: false,
            retiranteNome: null,
            retiranteCpf: null,
        };
    }
    try {
        var parsed = JSON.parse(payloadJson);
        if (parsed.retirada_por_terceiro !== true) {
            return {
                retiradaPorTerceiro: false,
                retiranteNome: null,
                retiranteCpf: null,
            };
        }
        var nome = typeof parsed.retirante_nome === "string" && parsed.retirante_nome.trim()
            ? parsed.retirante_nome.trim()
            : null;
        var cpf = typeof parsed.retirante_cpf === "string" && parsed.retirante_cpf.trim()
            ? parsed.retirante_cpf.trim()
            : null;
        return {
            retiradaPorTerceiro: true,
            retiranteNome: nome,
            retiranteCpf: cpf,
        };
    }
    catch (_a) {
        return {
            retiradaPorTerceiro: false,
            retiranteNome: null,
            retiranteCpf: null,
        };
    }
}
function csvEscape(value) {
    var str = String(value !== null && value !== void 0 ? value : "");
    return "\"".concat(str.replace(/"/g, '""'), "\"");
}
function buildAuditCsv(logs) {
    var header = [
        "checked_in_at",
        "created_at",
        "source_type",
        "event_id",
        "status",
        "request_id",
        "ticket_id",
        "ticket_source_id",
        "ticket_name",
        "ticket_code",
        "participant_id",
        "participant_name",
        "birth_date",
        "age_at_checkin",
        "operator_alias",
        "operator_device_id",
        "device_id",
        "retirada_por_terceiro",
        "retirante_nome",
        "retirante_cpf",
        "payload_json",
    ]
        .map(csvEscape)
        .join(",");
    var rows = logs.map(function (log) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        var retirante = parseAuditRetirantePayload(log.payload_json);
        return [
            log.checked_in_at,
            log.created_at,
            log.source_type,
            (_a = log.event_id) !== null && _a !== void 0 ? _a : "",
            log.status,
            log.request_id,
            log.ticket_id,
            (_b = log.ticket_source_id) !== null && _b !== void 0 ? _b : "",
            (_c = log.ticket_name) !== null && _c !== void 0 ? _c : "",
            (_d = log.ticket_code) !== null && _d !== void 0 ? _d : "",
            (_e = log.participant_id) !== null && _e !== void 0 ? _e : "",
            (_f = log.participant_name) !== null && _f !== void 0 ? _f : "",
            (_g = log.birth_date) !== null && _g !== void 0 ? _g : "",
            (_h = log.age_at_checkin) !== null && _h !== void 0 ? _h : "",
            (_j = log.operator_alias) !== null && _j !== void 0 ? _j : "",
            log.operator_device_id,
            log.device_id,
            retirante.retiradaPorTerceiro ? "true" : "false",
            (_k = retirante.retiranteNome) !== null && _k !== void 0 ? _k : "",
            (_l = retirante.retiranteCpf) !== null && _l !== void 0 ? _l : "",
            (_m = log.payload_json) !== null && _m !== void 0 ? _m : "",
        ]
            .map(csvEscape)
            .join(",");
    });
    return __spreadArray([header], rows, true).join("\n");
}
