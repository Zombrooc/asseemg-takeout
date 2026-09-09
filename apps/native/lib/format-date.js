"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateBR = formatDateBR;
exports.formatDateTimeBR = formatDateTimeBR;
exports.formatDateShort = formatDateShort;
var MONTHS = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
];
/** Formata data no padrão brasileiro: "22 de fevereiro de 2026" */
function formatDateBR(value) {
    if (value == null)
        return "—";
    var d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime()))
        return "—";
    var day = d.getDate();
    var month = MONTHS[d.getMonth()];
    var year = d.getFullYear();
    return "".concat(day, " de ").concat(month, " de ").concat(year);
}
/** Formata data e hora no padrão brasileiro: "22 de fevereiro de 2026, 14:30" */
function formatDateTimeBR(value) {
    if (value == null)
        return "—";
    var d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime()))
        return "—";
    var datePart = formatDateBR(d);
    var time = d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return "".concat(datePart, ", ").concat(time);
}
var WEEKDAY_SHORT = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
var MONTH_SHORT = [
    "jan.",
    "fev.",
    "mar.",
    "abr.",
    "mai.",
    "jun.",
    "jul.",
    "ago.",
    "set.",
    "out.",
    "nov.",
    "dez.",
];
/** Formata data em estilo curto: "sáb., 15 mar." */
function formatDateShort(value) {
    if (value == null)
        return "—";
    var d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime()))
        return "—";
    var w = WEEKDAY_SHORT[d.getDay()];
    var day = d.getDate();
    var month = MONTH_SHORT[d.getMonth()];
    return "".concat(w, " ").concat(day, " ").concat(month);
}
