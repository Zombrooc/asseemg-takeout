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
var async_storage_1 = require("@react-native-async-storage/async-storage");
var takeout_queue_1 = require("@/lib/takeout-queue");
jest.mock("@react-native-async-storage/async-storage", function () { return ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}); });
describe("takeout-queue", function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            jest.clearAllMocks();
            async_storage_1.default.getItem.mockResolvedValue(null);
            async_storage_1.default.setItem.mockResolvedValue(undefined);
            return [2 /*return*/];
        });
    }); });
    describe("getPendingQueue", function () {
        it("returns empty array when storage is empty", function () { return __awaiter(void 0, void 0, void 0, function () {
            var list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        async_storage_1.default.getItem.mockResolvedValue(null);
                        return [4 /*yield*/, (0, takeout_queue_1.getPendingQueue)()];
                    case 1:
                        list = _a.sent();
                        expect(list).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns parsed array when storage has valid JSON", function () { return __awaiter(void 0, void 0, void 0, function () {
            var stored, list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stored = [
                            { request_id: "r1", ticket_id: "T1", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
                        ];
                        async_storage_1.default.getItem.mockResolvedValue(JSON.stringify(stored));
                        return [4 /*yield*/, (0, takeout_queue_1.getPendingQueue)()];
                    case 1:
                        list = _a.sent();
                        expect(list).toEqual(stored);
                        return [2 /*return*/];
                }
            });
        }); });
        it("returns empty array when storage has invalid JSON", function () { return __awaiter(void 0, void 0, void 0, function () {
            var list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        async_storage_1.default.getItem.mockResolvedValue("not json");
                        return [4 /*yield*/, (0, takeout_queue_1.getPendingQueue)()];
                    case 1:
                        list = _a.sent();
                        expect(list).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("addToQueue", function () {
        it("appends item with created_at and persists", function () { return __awaiter(void 0, void 0, void 0, function () {
            var stored;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        async_storage_1.default.getItem.mockResolvedValue(null);
                        return [4 /*yield*/, (0, takeout_queue_1.addToQueue)({
                                request_id: "req-1",
                                ticket_id: "T1",
                                device_id: "d1",
                            })];
                    case 1:
                        _a.sent();
                        expect(async_storage_1.default.setItem).toHaveBeenCalledWith("takeout_pending_confirm", expect.stringContaining("req-1"));
                        stored = JSON.parse(async_storage_1.default.setItem.mock.calls[0][1]);
                        expect(stored).toHaveLength(1);
                        expect(stored[0]).toMatchObject({
                            request_id: "req-1",
                            ticket_id: "T1",
                            device_id: "d1",
                        });
                        expect(stored[0].created_at).toBeDefined();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("removeFromQueue", function () {
        it("removes item by request_id and persists", function () { return __awaiter(void 0, void 0, void 0, function () {
            var stored;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stored = [
                            { request_id: "r1", ticket_id: "T1", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
                            { request_id: "r2", ticket_id: "T2", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
                        ];
                        async_storage_1.default.getItem.mockResolvedValue(JSON.stringify(stored));
                        return [4 /*yield*/, (0, takeout_queue_1.removeFromQueue)("r1")];
                    case 1:
                        _a.sent();
                        expect(async_storage_1.default.setItem).toHaveBeenCalledWith("takeout_pending_confirm", JSON.stringify([stored[1]]));
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe("setQueue", function () {
        it("overwrites storage with given list", function () { return __awaiter(void 0, void 0, void 0, function () {
            var list;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        list = [
                            { request_id: "r1", ticket_id: "T1", device_id: "d1", created_at: "2026-01-01T00:00:00Z" },
                        ];
                        return [4 /*yield*/, (0, takeout_queue_1.setQueue)(list)];
                    case 1:
                        _a.sent();
                        expect(async_storage_1.default.setItem).toHaveBeenCalledWith("takeout_pending_confirm", JSON.stringify(list));
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
