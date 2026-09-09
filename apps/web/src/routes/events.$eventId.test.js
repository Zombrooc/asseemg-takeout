"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var participants_table_1 = require("@/components/participants-table");
var events__eventId_1 = require("./events.$eventId");
(0, vitest_1.describe)("mapLegacyToEventParticipant", function () {
    (0, vitest_1.it)("keeps legacy ingresso label as modality only", function () {
        var legacy = {
            id: "legacy-1",
            bibNumber: 12,
            name: "Runner Legacy",
            sex: "Feminino",
            cpf: "12345678900",
            birthDate: "2002-05-05",
            modality: "5KM",
            shirtSize: "P",
            team: "Time A",
            checkinDone: false,
        };
        var mapped = (0, events__eventId_1.mapLegacyToEventParticipant)(legacy);
        (0, vitest_1.expect)(mapped.sourceTicketId).toBeUndefined();
        (0, vitest_1.expect)((0, participants_table_1.resolveDisplayTicket)(mapped)).toBe("5KM");
        (0, vitest_1.expect)(mapped.bibNumber).toBe(12);
    });
    (0, vitest_1.it)("does not add cpf inconsistency marker in legacy mapping", function () {
        var _a;
        var legacy = {
            id: "legacy-2",
            bibNumber: 33,
            name: "Runner Missing CPF",
            sex: "Masculino",
            cpf: "",
            cpfInconsistent: true,
            birthDate: "2001-01-01",
            modality: "10KM",
            shirtSize: "M",
            team: null,
            checkinDone: false,
        };
        var mapped = (0, events__eventId_1.mapLegacyToEventParticipant)(legacy);
        (0, vitest_1.expect)((_a = mapped.customFormResponses) === null || _a === void 0 ? void 0 : _a.some(function (r) { return r.name === "cpf_inconsistente"; })).toBe(false);
    });
});
(0, vitest_1.describe)("participant search helpers", function () {
    var participant = {
        id: "seat-1",
        name: "Joao da Silva",
        cpf: "12345678900",
        birthDate: "1990-01-01",
        ticketId: "seat-1",
        sourceTicketId: "orig-5k",
        ticketName: "5KM",
        qrCode: "QR-ABC",
        checkinDone: false,
    };
    (0, vitest_1.it)("normalizes accents and casing", function () {
        (0, vitest_1.expect)((0, events__eventId_1.normalizeSearchValue)("  JOAO ")).toBe("joao");
    });
    (0, vitest_1.it)("matches by multiple fields", function () {
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "joao")).toBe(true);
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "12345678900")).toBe(true);
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "5km")).toBe(true);
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "orig-5k")).toBe(true);
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "not-found")).toBe(false);
    });
    (0, vitest_1.it)("matches CPF digits without formatting punctuation", function () {
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "123456789")).toBe(true);
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(participant, "999999999")).toBe(false);
    });
    (0, vitest_1.it)("matches by bib number", function () {
        var withBib = __assign(__assign({}, participant), { bibNumber: 42 });
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(withBib, "42")).toBe(true);
        // "77" does not appear in any other field of the fixture
        (0, vitest_1.expect)((0, events__eventId_1.participantMatchesSearch)(withBib, "77")).toBe(false);
    });
});
(0, vitest_1.describe)("ticket type helpers", function () {
    var participants = [
        {
            id: "seat-1",
            name: "A",
            cpf: "123",
            birthDate: "1990-01-01",
            ticketId: "seat-1",
            sourceTicketId: "orig-1",
            ticketName: "10KM",
            qrCode: "QR-1",
            checkinDone: true,
        },
        {
            id: "seat-2",
            name: "B",
            cpf: "456",
            birthDate: "1992-02-02",
            ticketId: "seat-2",
            sourceTicketId: "orig-2",
            ticketName: "5KM",
            qrCode: "QR-2",
            checkinDone: false,
        },
        {
            id: "seat-3",
            name: "C",
            cpf: "789",
            birthDate: "1991-03-03",
            ticketId: "seat-3",
            sourceTicketId: "orig-3",
            ticketName: " 5KM ",
            qrCode: "QR-3",
            checkinDone: false,
        },
        {
            id: "seat-4",
            name: "D",
            cpf: "999",
            birthDate: "1991-03-04",
            ticketId: "seat-4",
            sourceTicketId: "orig-4",
            ticketName: null,
            qrCode: "QR-4",
            checkinDone: false,
        },
    ];
    (0, vitest_1.it)("builds unique ticket type options from event participants", function () {
        (0, vitest_1.expect)((0, events__eventId_1.getTicketTypeOptions)(participants)).toEqual(["10KM", "5KM"]);
    });
    (0, vitest_1.it)("resolves initial ticket type from participant or fallback", function () {
        (0, vitest_1.expect)((0, events__eventId_1.resolveInitialTicketType)(participants[0], ["10KM", "5KM"])).toBe("10KM");
        (0, vitest_1.expect)((0, events__eventId_1.resolveInitialTicketType)(participants[3], ["10KM", "5KM"])).toBe("10KM");
        (0, vitest_1.expect)((0, events__eventId_1.resolveInitialTicketType)(participants[3], [])).toBe("");
    });
});
(0, vitest_1.describe)("birth date validation", function () {
    (0, vitest_1.it)("accepts only valid ISO dates within configured range", function () {
        (0, vitest_1.expect)((0, events__eventId_1.isBirthDateInAllowedRange)("1990-01-01", "1900-01-01", "2026-03-04")).toBe(true);
        (0, vitest_1.expect)((0, events__eventId_1.isBirthDateInAllowedRange)("1899-12-31", "1900-01-01", "2026-03-04")).toBe(false);
        (0, vitest_1.expect)((0, events__eventId_1.isBirthDateInAllowedRange)("2026-03-05", "1900-01-01", "2026-03-04")).toBe(false);
        (0, vitest_1.expect)((0, events__eventId_1.isBirthDateInAllowedRange)("2026-02-30", "1900-01-01", "2026-03-04")).toBe(false);
        (0, vitest_1.expect)((0, events__eventId_1.isBirthDateInAllowedRange)("03/04/2026", "1900-01-01", "2026-03-04")).toBe(false);
    });
});
(0, vitest_1.describe)("participant stats", function () {
    (0, vitest_1.it)("computes stats from full event list independent from filtered lists", function () {
        var all = [
            {
                id: "1",
                name: "Joao",
                cpf: "1",
                birthDate: "1990-01-01",
                ticketId: "1",
                sourceTicketId: "a",
                ticketName: "5KM",
                qrCode: "Q1",
                checkinDone: true,
            },
            {
                id: "2",
                name: "Maria",
                cpf: "2",
                birthDate: "1991-01-01",
                ticketId: "2",
                sourceTicketId: "b",
                ticketName: "5KM",
                qrCode: "Q2",
                checkinDone: false,
            },
            {
                id: "3",
                name: "Ana",
                cpf: "3",
                birthDate: "1992-01-01",
                ticketId: "3",
                sourceTicketId: "c",
                ticketName: "10KM",
                qrCode: "Q3",
                checkinDone: true,
            },
        ];
        var filtered = all.filter(function (p) { return p.name === "Maria"; });
        (0, vitest_1.expect)((0, events__eventId_1.getParticipantStats)(all)).toEqual({ total: 3, confirmed: 2, pending: 1 });
        (0, vitest_1.expect)(filtered).toHaveLength(1);
    });
});
