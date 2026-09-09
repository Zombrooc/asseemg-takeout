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
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var event_participants_export_1 = require("./event-participants-export");
var mocks = vitest_1.vi.hoisted(function () { return ({
    save: vitest_1.vi.fn(),
    writeTextFile: vitest_1.vi.fn(),
}); });
vitest_1.vi.mock("@tauri-apps/plugin-dialog", function () { return ({
    save: mocks.save,
}); });
vitest_1.vi.mock("@tauri-apps/plugin-fs", function () { return ({
    writeTextFile: mocks.writeTextFile,
}); });
var sampleParticipant = {
    id: "p-1",
    name: 'Ana "Souza"',
    cpf: "12345678900",
    birthDate: "2000-01-01",
    ticketId: "t-1",
    sourceTicketId: "orig-1",
    ticketName: "10K",
    qrCode: "QR-1",
    bibNumber: 42,
    shirtSize: "GG",
    team: "Equipe, Azul",
    checkinDone: false,
    customFormResponses: [
        {
            name: "sexo",
            label: "Sexo",
            type: "text",
            response: "Feminino",
        },
    ],
};
(0, vitest_1.describe)("event-participants-export", function () {
    (0, vitest_1.beforeEach)(function () {
        mocks.save.mockReset();
        mocks.writeTextFile.mockReset();
    });
    (0, vitest_1.afterEach)(function () {
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)("builds export records with stable shape", function () {
        var records = (0, event_participants_export_1.buildEventParticipantExportRecords)([sampleParticipant], {
            eventId: "ev export",
            eventName: 'Evento "Principal"',
            sourceType: "legacy_csv",
        });
        (0, vitest_1.expect)(records).toEqual([
            {
                eventId: "ev export",
                eventName: 'Evento "Principal"',
                sourceType: "legacy_csv",
                participantId: "p-1",
                name: 'Ana "Souza"',
                cpf: "12345678900",
                birthDate: "2000-01-01",
                ticketId: "t-1",
                sourceTicketId: "orig-1",
                ticketType: "10K",
                qrCode: "QR-1",
                bibNumber: 42,
                shirtSize: "GG",
                team: "Equipe, Azul",
                sex: "Feminino",
                checkinDone: false,
                customFormResponses: sampleParticipant.customFormResponses,
            },
        ]);
    });
    (0, vitest_1.it)("builds CSV with stable columns and escaped values", function () {
        var csv = (0, event_participants_export_1.buildEventParticipantsCsv)((0, event_participants_export_1.buildEventParticipantExportRecords)([sampleParticipant], {
            eventId: "ev export",
            eventName: 'Evento "Principal"',
            sourceType: "legacy_csv",
        }));
        var lines = csv.split("\n");
        (0, vitest_1.expect)(lines[0]).toContain('"eventId"');
        (0, vitest_1.expect)(lines[0]).toContain('"customFormResponses"');
        (0, vitest_1.expect)(lines[1]).toContain('"ev export"');
        (0, vitest_1.expect)(lines[1]).toContain('"Evento ""Principal"""');
        (0, vitest_1.expect)(lines[1]).toContain('"Ana ""Souza"""');
        (0, vitest_1.expect)(lines[1]).toContain('"Equipe, Azul"');
        (0, vitest_1.expect)(lines[1]).toContain('"[{""name"":""sexo""');
    });
    (0, vitest_1.it)("builds sanitized filenames", function () {
        (0, vitest_1.expect)((0, event_participants_export_1.buildEventParticipantsFilename)("ev export", "csv", "2026-07-03")).toBe("participantes-ev-export-2026-07-03.csv");
    });
    (0, vitest_1.it)("uses Tauri save dialog and writes the chosen path", function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    vitest_1.vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
                    mocks.save.mockResolvedValue("C:/exports/participantes.csv");
                    return [4 /*yield*/, (0, event_participants_export_1.exportEventParticipantsFile)({
                            eventId: "ev-1",
                            eventName: "Evento 1",
                            participants: [sampleParticipant],
                            sourceType: "legacy_csv",
                            format: "csv",
                            date: "2026-07-03",
                        })];
                case 1:
                    result = _a.sent();
                    (0, vitest_1.expect)(mocks.save).toHaveBeenCalledWith({
                        defaultPath: "participantes-ev-1-2026-07-03.csv",
                        filters: [{ name: "CSV", extensions: ["csv"] }],
                    });
                    (0, vitest_1.expect)(mocks.writeTextFile).toHaveBeenCalledTimes(1);
                    (0, vitest_1.expect)(mocks.writeTextFile.mock.calls[0][0]).toBe("C:/exports/participantes.csv");
                    (0, vitest_1.expect)(mocks.writeTextFile.mock.calls[0][1]).toContain('"participantId","name","cpf"');
                    (0, vitest_1.expect)(result).toEqual({
                        status: "saved",
                        count: 1,
                        path: "C:/exports/participantes.csv",
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("does not write when the user cancels the save dialog", function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    vitest_1.vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
                    mocks.save.mockResolvedValue(null);
                    return [4 /*yield*/, (0, event_participants_export_1.exportEventParticipantsFile)({
                            eventId: "ev-1",
                            eventName: "Evento 1",
                            participants: [sampleParticipant],
                            sourceType: "json_sync",
                            format: "json",
                            date: "2026-07-03",
                        })];
                case 1:
                    result = _a.sent();
                    (0, vitest_1.expect)(mocks.writeTextFile).not.toHaveBeenCalled();
                    (0, vitest_1.expect)(result).toEqual({
                        status: "cancelled",
                        count: 1,
                    });
                    return [2 /*return*/];
            }
        });
    }); });
});
