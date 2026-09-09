"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLegacyParticipantAlertMap = buildLegacyParticipantAlertMap;
function normalizeWhitespace(value) {
    return value.replace(/\s+/g, " ").trim();
}
function normalizeName(value) {
    if (!value)
        return "";
    return normalizeWhitespace(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
function normalizeCpf(value) {
    if (!value)
        return "";
    return value.replace(/\D/g, "");
}
function hasBirthDate(value) {
    return Boolean(value === null || value === void 0 ? void 0 : value.trim());
}
function isValidCpfDigits(cpfDigits) {
    if (!/^\d{11}$/.test(cpfDigits))
        return false;
    if (/^(\d)\1{10}$/.test(cpfDigits))
        return false;
    var digits = cpfDigits.split("").map(Number);
    var calcDigit = function (sliceLength) {
        var sum = digits
            .slice(0, sliceLength)
            .reduce(function (acc, digit, index) { return acc + digit * (sliceLength + 1 - index); }, 0);
        var mod = (sum * 10) % 11;
        return mod === 10 ? 0 : mod;
    };
    return calcDigit(9) === digits[9] && calcDigit(10) === digits[10];
}
function compareParticipants(a, b) {
    var _a, _b;
    var aBib = (_a = a.bibNumber) !== null && _a !== void 0 ? _a : Number.POSITIVE_INFINITY;
    var bBib = (_b = b.bibNumber) !== null && _b !== void 0 ? _b : Number.POSITIVE_INFINITY;
    if (aBib !== bBib)
        return aBib - bBib;
    return a.id.localeCompare(b.id, "pt-BR");
}
function participantReference(participant) {
    var _a;
    if (participant.bibNumber != null) {
        return "#".concat(participant.bibNumber);
    }
    return ((_a = participant.name) === null || _a === void 0 ? void 0 : _a.trim()) || participant.id;
}
function relatedParticipantsMessage(prefix, participant, related) {
    var others = related
        .filter(function (item) { return item.id !== participant.id; })
        .sort(compareParticipants)
        .map(participantReference);
    if (others.length === 0) {
        return prefix;
    }
    return "".concat(prefix, " Tamb\u00E9m aparece no(s) n\u00FAmero(s): ").concat(others.join(", "), ".");
}
function addAlert(alertMap, participantId, code, message) {
    var _a;
    var current = (_a = alertMap[participantId]) !== null && _a !== void 0 ? _a : [];
    current.push({ code: code, message: message });
    alertMap[participantId] = current;
}
function buildLegacyParticipantAlertMap(participants) {
    var _a, _b, _c;
    var alertMap = {};
    var participantsByCpf = new Map();
    var participantsByNameAndCpf = new Map();
    var participantsByName = new Map();
    for (var _i = 0, participants_1 = participants; _i < participants_1.length; _i++) {
        var participant = participants_1[_i];
        var cpfDigits = normalizeCpf(participant.cpf);
        var normalizedName = normalizeName(participant.name);
        if (cpfDigits) {
            var cpfGroup = (_a = participantsByCpf.get(cpfDigits)) !== null && _a !== void 0 ? _a : [];
            cpfGroup.push(participant);
            participantsByCpf.set(cpfDigits, cpfGroup);
        }
        if (normalizedName && cpfDigits) {
            var nameAndCpfKey = "".concat(normalizedName, "::").concat(cpfDigits);
            var nameAndCpfGroup = (_b = participantsByNameAndCpf.get(nameAndCpfKey)) !== null && _b !== void 0 ? _b : [];
            nameAndCpfGroup.push(participant);
            participantsByNameAndCpf.set(nameAndCpfKey, nameAndCpfGroup);
        }
        if (normalizedName) {
            var nameGroup = (_c = participantsByName.get(normalizedName)) !== null && _c !== void 0 ? _c : [];
            nameGroup.push(participant);
            participantsByName.set(normalizedName, nameGroup);
        }
        if (!cpfDigits && !hasBirthDate(participant.birthDate)) {
            addAlert(alertMap, participant.id, "missing_cpf_and_birth_date", "Sem CPF e data de nascimento.");
        }
        if (cpfDigits && !isValidCpfDigits(cpfDigits)) {
            addAlert(alertMap, participant.id, "invalid_cpf", "CPF inválido.");
        }
    }
    for (var _d = 0, _e = participantsByCpf.values(); _d < _e.length; _d++) {
        var related = _e[_d];
        if (related.length < 2)
            continue;
        for (var _f = 0, related_1 = related; _f < related_1.length; _f++) {
            var participant = related_1[_f];
            addAlert(alertMap, participant.id, "duplicate_cpf", relatedParticipantsMessage("Mesmo CPF em duas inscrições.", participant, related));
        }
    }
    for (var _g = 0, _h = participantsByNameAndCpf.values(); _g < _h.length; _g++) {
        var related = _h[_g];
        if (related.length < 2)
            continue;
        for (var _j = 0, related_2 = related; _j < related_2.length; _j++) {
            var participant = related_2[_j];
            addAlert(alertMap, participant.id, "duplicate_name_cpf", relatedParticipantsMessage("Nome e CPF duplicados.", participant, related));
        }
    }
    for (var _k = 0, _l = participantsByName.values(); _k < _l.length; _k++) {
        var related = _l[_k];
        var distinctCpfs = Array.from(new Set(related.map(function (participant) { return normalizeCpf(participant.cpf); }).filter(Boolean)));
        if (distinctCpfs.length < 2)
            continue;
        for (var _m = 0, related_3 = related; _m < related_3.length; _m++) {
            var participant = related_3[_m];
            if (!normalizeCpf(participant.cpf))
                continue;
            addAlert(alertMap, participant.id, "duplicate_name_different_cpf", relatedParticipantsMessage("Mesmo nome com CPF diferente.", participant, related));
        }
    }
    return alertMap;
}
