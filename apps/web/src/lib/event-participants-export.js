"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.buildEventParticipantExportRecords = buildEventParticipantExportRecords;
exports.buildEventParticipantsCsv = buildEventParticipantsCsv;
exports.buildEventParticipantsFilename = buildEventParticipantsFilename;
exports.exportEventParticipantsFile = exportEventParticipantsFile;
var CSV_COLUMNS = [
    "eventId",
    "eventName",
    "sourceType",
    "participantId",
    "name",
    "cpf",
    "birthDate",
    "ticketId",
    "sourceTicketId",
    "ticketType",
    "qrCode",
    "bibNumber",
    "shirtSize",
    "team",
    "sex",
    "checkinDone",
    "customFormResponses",
];
function csvEscape(value) {
    var str = String(value !== null && value !== void 0 ? value : "");
    return "\"".concat(str.replace(/"/g, '""'), "\"");
}
function sanitizeFilenamePart(value) {
    return value.trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "evento";
}
function normalizeString(value) {
    if (value == null)
        return null;
    return value;
}
function resolveParticipantSex(participant) {
    var _a;
    if (participant.sex != null && participant.sex.trim() !== "") {
        return participant.sex;
    }
    var response = (_a = participant.customFormResponses) === null || _a === void 0 ? void 0 : _a.find(function (item) {
        var name = item.name.trim().toLowerCase();
        var label = item.label.trim().toLowerCase();
        return name === "sexo" || name === "sex" || label === "sexo" || label === "sex";
    });
    if (response == null)
        return null;
    if (typeof response.response === "string") {
        return response.response.trim() || null;
    }
    if (response.response == null)
        return null;
    return String(response.response);
}
function buildEventParticipantExportRecords(participants, metadata) {
    return participants.map(function (participant) {
        var _a, _b;
        return ({
            eventId: metadata.eventId,
            eventName: metadata.eventName,
            sourceType: metadata.sourceType,
            participantId: participant.id,
            name: normalizeString(participant.name),
            cpf: normalizeString(participant.cpf),
            birthDate: normalizeString(participant.birthDate),
            ticketId: participant.ticketId,
            sourceTicketId: normalizeString(participant.sourceTicketId),
            ticketType: normalizeString(participant.ticketName),
            qrCode: participant.qrCode,
            bibNumber: (_a = participant.bibNumber) !== null && _a !== void 0 ? _a : null,
            shirtSize: normalizeString(participant.shirtSize),
            team: normalizeString(participant.team),
            sex: resolveParticipantSex(participant),
            checkinDone: participant.checkinDone,
            customFormResponses: (_b = participant.customFormResponses) !== null && _b !== void 0 ? _b : null,
        });
    });
}
function buildEventParticipantsCsv(records) {
    var header = CSV_COLUMNS.map(csvEscape).join(",");
    var rows = records.map(function (record) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        return [
            record.eventId,
            record.eventName,
            record.sourceType,
            record.participantId,
            (_a = record.name) !== null && _a !== void 0 ? _a : "",
            (_b = record.cpf) !== null && _b !== void 0 ? _b : "",
            (_c = record.birthDate) !== null && _c !== void 0 ? _c : "",
            record.ticketId,
            (_d = record.sourceTicketId) !== null && _d !== void 0 ? _d : "",
            (_e = record.ticketType) !== null && _e !== void 0 ? _e : "",
            record.qrCode,
            (_f = record.bibNumber) !== null && _f !== void 0 ? _f : "",
            (_g = record.shirtSize) !== null && _g !== void 0 ? _g : "",
            (_h = record.team) !== null && _h !== void 0 ? _h : "",
            (_j = record.sex) !== null && _j !== void 0 ? _j : "",
            record.checkinDone ? "true" : "false",
            JSON.stringify((_k = record.customFormResponses) !== null && _k !== void 0 ? _k : null),
        ]
            .map(csvEscape)
            .join(",");
    });
    return __spreadArray([header], rows, true).join("\n");
}
function buildEventParticipantsFilename(eventId, format, date) {
    if (date === void 0) { date = new Date().toISOString().slice(0, 10); }
    return "participantes-".concat(sanitizeFilenamePart(eventId), "-").concat(date, ".").concat(format);
}
function isTauriRuntime() {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
function downloadWithBlob(content, filename, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
function exportEventParticipantsFile(params) {
    return __awaiter(this, void 0, void 0, function () {
        var records, filename, content, mimeType, _a, save, writeTextFile, targetPath;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    records = buildEventParticipantExportRecords(params.participants, {
                        eventId: params.eventId,
                        eventName: params.eventName,
                        sourceType: params.sourceType,
                    });
                    filename = buildEventParticipantsFilename(params.eventId, params.format, params.date);
                    content = params.format === "csv" ? buildEventParticipantsCsv(records) : JSON.stringify(records, null, 2);
                    mimeType = params.format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
                    if (!isTauriRuntime()) return [3 /*break*/, 4];
                    return [4 /*yield*/, Promise.all([
                            Promise.resolve().then(function () { return require("@tauri-apps/plugin-dialog"); }),
                            Promise.resolve().then(function () { return require("@tauri-apps/plugin-fs"); }),
                        ])];
                case 1:
                    _a = _b.sent(), save = _a[0].save, writeTextFile = _a[1].writeTextFile;
                    return [4 /*yield*/, save({
                            defaultPath: filename,
                            filters: [
                                {
                                    name: params.format.toUpperCase(),
                                    extensions: [params.format],
                                },
                            ],
                        })];
                case 2:
                    targetPath = _b.sent();
                    if (targetPath == null || Array.isArray(targetPath)) {
                        return [2 /*return*/, { status: "cancelled", count: records.length }];
                    }
                    return [4 /*yield*/, writeTextFile(targetPath, content)];
                case 3:
                    _b.sent();
                    return [2 /*return*/, {
                            status: "saved",
                            count: records.length,
                            path: targetPath,
                        }];
                case 4:
                    downloadWithBlob(content, filename, mimeType);
                    return [2 /*return*/, { status: "downloaded", count: records.length }];
            }
        });
    });
}
