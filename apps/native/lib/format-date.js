"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateBR = formatDateBR;
exports.formatDateOnlyBR = formatDateOnlyBR;
exports.formatDateTimeBR = formatDateTimeBR;
exports.formatDateShort = formatDateShort;
exports.normalizeDateOnly = normalizeDateOnly;
exports.parseDateOnlyParts = parseDateOnlyParts;
exports.parseDateValue = parseDateValue;
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
function createCalendarDate(year, month, day) {
    var date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
}
function isValidCalendarDate(_a) {
    var year = _a.year, month = _a.month, day = _a.day;
    if (month < 1 || month > 12 || day < 1)
        return false;
    var leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    var daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    return day <= daysInMonth;
}
function parseDateOnlyParts(value) {
    if (value == null)
        return null;
    var trimmed = value.trim();
    var iso = /^(\d{4})-(\d{2})-(\d{2})(?=$|T|\s)/.exec(trimmed);
    if (iso) {
        var parts = { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
        return isValidCalendarDate(parts) ? parts : null;
    }
    var brazilian = /^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{4})$/.exec(trimmed);
    if (brazilian) {
        var parts = { year: Number(brazilian[3]), month: Number(brazilian[2]), day: Number(brazilian[1]) };
        return isValidCalendarDate(parts) ? parts : null;
    }
    return null;
}
function normalizeDateOnly(value) {
    var parts = parseDateOnlyParts(value);
    if (!parts)
        return null;
    return "".concat(parts.year.toString().padStart(4, "0"), "-").concat(parts.month.toString().padStart(2, "0"), "-").concat(parts.day.toString().padStart(2, "0"));
}
function formatDateOnlyBR(value) {
    var parts = parseDateOnlyParts(value);
    if (!parts)
        return "—";
    return "".concat(parts.day, " de ").concat(MONTHS[parts.month - 1], " de ").concat(parts.year);
}
function parseDateValue(value) {
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    var trimmed = value.trim();
    var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (iso)
        return createCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    var brazilian = /^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{4})$/.exec(trimmed);
    if (brazilian)
        return createCalendarDate(Number(brazilian[3]), Number(brazilian[2]), Number(brazilian[1]));
    var parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
/** Formata data no padrão brasileiro: "22 de fevereiro de 2026" */
function formatDateBR(value) {
    if (value == null)
        return "—";
    var d = parseDateValue(value);
    if (!d)
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
    var d = parseDateValue(value);
    if (!d)
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
    var d = parseDateValue(value);
    if (!d)
        return "—";
    var w = WEEKDAY_SHORT[d.getDay()];
    var day = d.getDate();
    var month = MONTH_SHORT[d.getMonth()];
    return "".concat(w, " ").concat(day, " ").concat(month);
}
