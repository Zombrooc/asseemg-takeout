"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var legacy_participant_alerts_1 = require("@pickup/api/legacy-participant-alerts");
function createParticipant(overrides) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    return {
        id: (_a = overrides.id) !== null && _a !== void 0 ? _a : crypto.randomUUID(),
        name: (_b = overrides.name) !== null && _b !== void 0 ? _b : "Participante",
        cpf: (_c = overrides.cpf) !== null && _c !== void 0 ? _c : "",
        birthDate: (_d = overrides.birthDate) !== null && _d !== void 0 ? _d : "1990-01-01",
        ticketId: (_f = (_e = overrides.ticketId) !== null && _e !== void 0 ? _e : overrides.id) !== null && _f !== void 0 ? _f : "ticket",
        sourceTicketId: (_g = overrides.sourceTicketId) !== null && _g !== void 0 ? _g : null,
        ticketName: (_h = overrides.ticketName) !== null && _h !== void 0 ? _h : "5KM",
        qrCode: (_k = (_j = overrides.qrCode) !== null && _j !== void 0 ? _j : overrides.id) !== null && _k !== void 0 ? _k : "qr",
        checkinDone: (_l = overrides.checkinDone) !== null && _l !== void 0 ? _l : false,
        bibNumber: (_m = overrides.bibNumber) !== null && _m !== void 0 ? _m : null,
        customFormResponses: overrides.customFormResponses,
        shirtSize: overrides.shirtSize,
        team: overrides.team,
    };
}
(0, vitest_1.describe)("buildLegacyParticipantAlertMap", function () {
    (0, vitest_1.it)("flags duplicate CPF with related bib numbers", function () {
        var _a, _b;
        var participants = [
            createParticipant({ id: "p1", bibNumber: 12, name: "Ana", cpf: "529.982.247-25" }),
            createParticipant({ id: "p2", bibNumber: 18, name: "Bruna", cpf: "52998224725" }),
        ];
        var alerts = (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants);
        (0, vitest_1.expect)((_a = alerts.p1) === null || _a === void 0 ? void 0 : _a.map(function (item) { return item.message; })).toContain("Mesmo CPF em duas inscrições. Também aparece no(s) número(s): #18.");
        (0, vitest_1.expect)((_b = alerts.p2) === null || _b === void 0 ? void 0 : _b.map(function (item) { return item.message; })).toContain("Mesmo CPF em duas inscrições. Também aparece no(s) número(s): #12.");
    });
    (0, vitest_1.it)("flags duplicate name and CPF", function () {
        var _a, _b;
        var participants = [
            createParticipant({ id: "p1", bibNumber: 7, name: "Carlos Lima", cpf: "52998224725" }),
            createParticipant({ id: "p2", bibNumber: 9, name: " Carlos  Lima ", cpf: "529.982.247-25" }),
        ];
        var alerts = (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants);
        (0, vitest_1.expect)((_a = alerts.p1) === null || _a === void 0 ? void 0 : _a.map(function (item) { return item.code; })).toContain("duplicate_name_cpf");
        (0, vitest_1.expect)((_b = alerts.p1) === null || _b === void 0 ? void 0 : _b.map(function (item) { return item.message; })).toContain("Nome e CPF duplicados. Também aparece no(s) número(s): #9.");
    });
    (0, vitest_1.it)("flags same normalized name with different non-empty CPFs", function () {
        var _a, _b;
        var participants = [
            createParticipant({ id: "p1", bibNumber: 4, name: "João   Silva", cpf: "52998224725" }),
            createParticipant({ id: "p2", bibNumber: 10, name: "joao silva", cpf: "12345678909" }),
            createParticipant({ id: "p3", bibNumber: 20, name: "joao silva", cpf: "" }),
        ];
        var alerts = (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants);
        (0, vitest_1.expect)((_a = alerts.p1) === null || _a === void 0 ? void 0 : _a.map(function (item) { return item.message; })).toContain("Mesmo nome com CPF diferente. Também aparece no(s) número(s): #10, #20.");
        (0, vitest_1.expect)((_b = alerts.p2) === null || _b === void 0 ? void 0 : _b.map(function (item) { return item.message; })).toContain("Mesmo nome com CPF diferente. Também aparece no(s) número(s): #4, #20.");
        (0, vitest_1.expect)(alerts.p3).toBeUndefined();
    });
    (0, vitest_1.it)("flags participants missing both CPF and birth date", function () {
        var _a;
        var participants = [
            createParticipant({ id: "p1", bibNumber: 3, cpf: " ", birthDate: " " }),
            createParticipant({ id: "p2", bibNumber: 4, cpf: "", birthDate: "1990-01-01" }),
        ];
        var alerts = (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants);
        (0, vitest_1.expect)((_a = alerts.p1) === null || _a === void 0 ? void 0 : _a.map(function (item) { return item.message; })).toContain("Sem CPF e data de nascimento.");
        (0, vitest_1.expect)(alerts.p2).toBeUndefined();
    });
    (0, vitest_1.it)("flags invalid CPF values", function () {
        var _a, _b;
        var participants = [
            createParticipant({ id: "p1", bibNumber: 1, name: "Ana", cpf: "111.111.111-11" }),
            createParticipant({ id: "p2", bibNumber: 2, name: "Ana", cpf: "12345678900" }),
            createParticipant({ id: "p3", bibNumber: 3, name: "Bruna", cpf: "529.982.247-25" }),
        ];
        var alerts = (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants);
        (0, vitest_1.expect)((_a = alerts.p1) === null || _a === void 0 ? void 0 : _a.map(function (item) { return item.message; })).toContain("CPF inválido.");
        (0, vitest_1.expect)((_b = alerts.p2) === null || _b === void 0 ? void 0 : _b.map(function (item) { return item.message; })).toContain("CPF inválido.");
        (0, vitest_1.expect)(alerts.p3).toBeUndefined();
    });
    (0, vitest_1.it)("accumulates multiple alerts for the same participant", function () {
        var _a;
        var participants = [
            createParticipant({ id: "p1", bibNumber: 12, name: "Ana", cpf: "12345678900" }),
            createParticipant({ id: "p2", bibNumber: 18, name: "Ana", cpf: "12345678900" }),
            createParticipant({ id: "p3", bibNumber: 20, name: "Ana", cpf: "52998224725" }),
        ];
        var alerts = (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants);
        (0, vitest_1.expect)((_a = alerts.p1) === null || _a === void 0 ? void 0 : _a.map(function (item) { return item.code; })).toEqual([
            "invalid_cpf",
            "duplicate_cpf",
            "duplicate_name_cpf",
            "duplicate_name_different_cpf",
        ]);
    });
});
