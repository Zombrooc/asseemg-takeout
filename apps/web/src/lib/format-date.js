"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateBR = formatDateBR;
exports.formatDateTimeBR = formatDateTimeBR;
exports.formatBirthDateBR = formatBirthDateBR;
var MONTHS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
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
    var time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return "".concat(datePart, ", ").concat(time);
}
/** Formata data ISO (YYYY-MM-DD) para o formato curto brasileiro (DD/MM/YYYY) sem usar new Date() */
function formatBirthDateBR(value) {
    if (value == null || value === "")
        return "-";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!m)
        return value;
    return "".concat(m[3], "/").concat(m[2], "/").concat(m[1]);
}
