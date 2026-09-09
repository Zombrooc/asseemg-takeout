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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("@testing-library/react");
var react_query_1 = require("@tanstack/react-query");
var vitest_1 = require("vitest");
var react_2 = require("react");
var export_event_participants_button_1 = require("../export-event-participants-button");
var mocks = vitest_1.vi.hoisted(function () { return ({
    exportEventParticipantsFile: vitest_1.vi.fn(),
    toast: {
        error: vitest_1.vi.fn(),
        success: vitest_1.vi.fn(),
    },
}); });
vitest_1.vi.mock("@/lib/event-participants-export", function () { return ({
    exportEventParticipantsFile: mocks.exportEventParticipantsFile,
}); });
vitest_1.vi.mock("sonner", function () { return ({
    toast: mocks.toast,
}); });
vitest_1.vi.mock("@/components/ui/button", function () { return ({
    Button: function (_a) {
        var children = _a.children, props = __rest(_a, ["children"]);
        return <button {...props}>{children}</button>;
    },
}); });
vitest_1.vi.mock("@/components/ui/dropdown-menu", function () { return ({
    DropdownMenu: function (_a) {
        var children = _a.children;
        return <div>{children}</div>;
    },
    DropdownMenuTrigger: function (_a) {
        var children = _a.children, render = _a.render, props = __rest(_a, ["children", "render"]);
        return render ? react_2.default.cloneElement(render, props, children) : <button {...props}>{children}</button>;
    },
    DropdownMenuContent: function (_a) {
        var children = _a.children;
        return <div>{children}</div>;
    },
    DropdownMenuItem: function (_a) {
        var children = _a.children, onClick = _a.onClick;
        return <button onClick={onClick}>{children}</button>;
    },
}); });
function renderWithQueryClient(ui) {
    var client = new react_query_1.QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return (0, react_1.render)(<react_query_1.QueryClientProvider client={client}>{ui}</react_query_1.QueryClientProvider>);
}
var sampleParticipants = [
    {
        id: "p-1",
        name: "Ana",
        cpf: "123",
        birthDate: "2000-01-01",
        ticketId: "t-1",
        sourceTicketId: "orig-1",
        ticketName: "5K",
        qrCode: "QR-1",
        checkinDone: false,
        customFormResponses: [],
    },
];
(0, vitest_1.describe)("ExportEventParticipantsButton", function () {
    (0, vitest_1.beforeEach)(function () {
        mocks.exportEventParticipantsFile.mockReset();
        mocks.toast.error.mockReset();
        mocks.toast.success.mockReset();
    });
    (0, vitest_1.it)("exports CSV using the full participant collection passed to the button", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mocks.exportEventParticipantsFile.mockResolvedValue({ status: "saved", count: 1, path: "x.csv" });
                    renderWithQueryClient(<export_event_participants_button_1.ExportEventParticipantsButton eventId="ev-1" eventName="Evento 1" participants={sampleParticipants} sourceType="json_sync"/>);
                    react_1.fireEvent.click(react_1.screen.getByRole("button", { name: /exportar csv/i }));
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            return (0, vitest_1.expect)(mocks.exportEventParticipantsFile).toHaveBeenCalledWith({
                                eventId: "ev-1",
                                eventName: "Evento 1",
                                participants: sampleParticipants,
                                sourceType: "json_sync",
                                format: "csv",
                            });
                        })];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mocks.toast.success).toHaveBeenCalledWith("Arquivo CSV salvo (1 participante(s)).");
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("exports JSON when selected", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mocks.exportEventParticipantsFile.mockResolvedValue({ status: "saved", count: 1, path: "x.json" });
                    renderWithQueryClient(<export_event_participants_button_1.ExportEventParticipantsButton eventId="ev-1" eventName="Evento 1" participants={sampleParticipants} sourceType="legacy_csv"/>);
                    react_1.fireEvent.click(react_1.screen.getByRole("button", { name: /exportar json/i }));
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            return (0, vitest_1.expect)(mocks.exportEventParticipantsFile).toHaveBeenCalledWith({
                                eventId: "ev-1",
                                eventName: "Evento 1",
                                participants: sampleParticipants,
                                sourceType: "legacy_csv",
                                format: "json",
                            });
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, vitest_1.it)("shows empty-state feedback and skips export", function () {
        renderWithQueryClient(<export_event_participants_button_1.ExportEventParticipantsButton eventId="ev-1" eventName="Evento 1" participants={[]} sourceType="json_sync"/>);
        react_1.fireEvent.click(react_1.screen.getByRole("button", { name: /exportar csv/i }));
        (0, vitest_1.expect)(mocks.toast.error).toHaveBeenCalledWith("Nenhum participante para exportar.");
        (0, vitest_1.expect)(mocks.exportEventParticipantsFile).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("stops silently when the save dialog is cancelled", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    mocks.exportEventParticipantsFile.mockResolvedValue({ status: "cancelled", count: 1 });
                    renderWithQueryClient(<export_event_participants_button_1.ExportEventParticipantsButton eventId="ev-1" eventName="Evento 1" participants={sampleParticipants} sourceType="json_sync"/>);
                    react_1.fireEvent.click(react_1.screen.getByRole("button", { name: /exportar csv/i }));
                    return [4 /*yield*/, (0, react_1.waitFor)(function () { return (0, vitest_1.expect)(mocks.exportEventParticipantsFile).toHaveBeenCalled(); })];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(mocks.toast.success).not.toHaveBeenCalled();
                    (0, vitest_1.expect)(mocks.toast.error).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
