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
var participants_table_1 = require("../participants-table");
function buildParticipant(overrides) {
    return __assign({ id: "p1", name: "Runner", cpf: "12345678900", ticketId: "ticket-1", sourceTicketId: "Inteira", ticketName: "5KM", qrCode: "qr-1", checkinDone: false }, overrides);
}
(0, vitest_1.describe)("resolveDisplayTicket", function () {
    (0, vitest_1.it)("formats json ticket as ingresso + tipo", function () {
        var row = buildParticipant({ sourceTicketId: "Inteira", ticketName: "5KM" });
        (0, vitest_1.expect)((0, participants_table_1.resolveDisplayTicket)(row)).toBe("Inteira - 5KM");
    });
    (0, vitest_1.it)("shows only ticketName for csv when sourceTicketId is missing", function () {
        var row = buildParticipant({ sourceTicketId: undefined, ticketName: "5KM" });
        (0, vitest_1.expect)((0, participants_table_1.resolveDisplayTicket)(row)).toBe("5KM");
    });
    (0, vitest_1.it)("ignores legacy placeholder sourceTicketId when ticketName exists", function () {
        var row = buildParticipant({ sourceTicketId: "#12", ticketName: "5KM" });
        (0, vitest_1.expect)((0, participants_table_1.resolveDisplayTicket)(row)).toBe("5KM");
    });
    (0, vitest_1.it)("falls back to sourceTicketId when ticketName is missing", function () {
        var row = buildParticipant({ ticketName: undefined, sourceTicketId: "Cortesia" });
        (0, vitest_1.expect)((0, participants_table_1.resolveDisplayTicket)(row)).toBe("Cortesia");
    });
    (0, vitest_1.it)("falls back to ticketId when ticketName and sourceTicketId are missing", function () {
        var row = buildParticipant({ ticketName: undefined, sourceTicketId: undefined, ticketId: "ticket-9" });
        (0, vitest_1.expect)((0, participants_table_1.resolveDisplayTicket)(row)).toBe("ticket-9");
    });
});
