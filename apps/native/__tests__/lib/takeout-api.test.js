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
var takeout_api_1 = require("@/lib/takeout-api");
describe("createTakeoutClient", function () {
    var baseUrl = "http://192.168.1.10:5555";
    beforeEach(function () {
        global.fetch = jest.fn();
    });
    it("calls GET /health with skipAuth and no Bearer", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client, call;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve(JSON.stringify({ status: "ok" })); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.getHealth()];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/health", expect.objectContaining({
                        headers: expect.objectContaining({ "Content-Type": "application/json" }),
                    }));
                    call = global.fetch.mock.calls[0][1];
                    expect(call.headers).not.toHaveProperty("Authorization");
                    return [2 /*return*/];
            }
        });
    }); });
    it("calls GET /events with Authorization Bearer", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve("[]"); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "my-token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.getEvents()];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/events", expect.objectContaining({
                        headers: expect.objectContaining({
                            Authorization: "Bearer my-token",
                            "Content-Type": "application/json",
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("POST /takeout/confirm sends request_id, ticket_id, device_id", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve(JSON.stringify({ status: "CONFIRMED" })); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "dev-1"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.postTakeoutConfirm({
                            request_id: "req-uuid",
                            ticket_id: "T1",
                            device_id: "dev-1",
                        })];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/takeout/confirm", expect.objectContaining({
                        method: "POST",
                        body: JSON.stringify({
                            request_id: "req-uuid",
                            ticket_id: "T1",
                            device_id: "dev-1",
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("throws TakeoutApiError when response not ok", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: false,
                        status: 401,
                        text: function () { return Promise.resolve("Unauthorized"); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "bad"];
                        }); }); },
                    });
                    return [4 /*yield*/, expect(client.getEvents()).rejects.toMatchObject({
                            name: takeout_api_1.TakeoutApiError.name,
                            status: 401,
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it("POST /events/:eventId/checkins/reset sends request and returns deleted count", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve(JSON.stringify({ deleted: 3 })); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.postResetEventCheckins("ev-123")];
                case 1:
                    result = _a.sent();
                    expect(result).toEqual({ deleted: 3 });
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/events/ev-123/checkins/reset", expect.objectContaining({
                        method: "POST",
                        headers: expect.objectContaining({
                            Authorization: "Bearer token",
                            "Content-Type": "application/json",
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("calls GET /network/addresses without auth when requested", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client, call;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () {
                            return Promise.resolve(JSON.stringify({
                                baseUrl: "http://192.168.1.10:5555",
                                port: 5555,
                                addresses: [],
                            }));
                        },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.getNetworkAddresses()];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/network/addresses", expect.objectContaining({
                        headers: expect.objectContaining({ "Content-Type": "application/json" }),
                    }));
                    call = global.fetch.mock.calls[0][1];
                    expect(call.headers).not.toHaveProperty("Authorization");
                    return [2 /*return*/];
            }
        });
    }); });
    it("GET /audit with status filter builds query string", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve("[]"); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.getAudit({ eventId: "ev-1", status: "CONFIRMED" })];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/audit?eventId=ev-1&status=CONFIRMED", expect.any(Object));
                    return [2 /*return*/];
            }
        });
    }); });
    it("GET /audit requires eventId", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            client = (0, takeout_api_1.createTakeoutClient)({
                baseUrl: baseUrl,
                getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, "token"];
                }); }); },
            });
            expect(function () { return client.getAudit({ eventId: "" }); }).toThrow("eventId is required");
            return [2 /*return*/];
        });
    }); });
    it("GET /events/:eventId/participants/search sends q and mode", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve("[]"); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "my-token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.searchEventParticipants("ev-123", "joao", "nome")];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/events/ev-123/participants/search?q=joao&mode=nome", expect.objectContaining({
                        headers: expect.objectContaining({
                            Authorization: "Bearer my-token",
                            "Content-Type": "application/json",
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("POST /takeout/confirm sends payload_json when provided", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve(JSON.stringify({ status: "CONFIRMED" })); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "dev-1"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.postTakeoutConfirm({
                            request_id: "req-uuid",
                            ticket_id: "T1",
                            device_id: "dev-1",
                            payload_json: '{"retirada_por_terceiro":true,"retirante_nome":"Joao","retirante_cpf":"123"}',
                        })];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/takeout/confirm", expect.objectContaining({
                        method: "POST",
                        body: JSON.stringify({
                            request_id: "req-uuid",
                            ticket_id: "T1",
                            device_id: "dev-1",
                            payload_json: '{"retirada_por_terceiro":true,"retirante_nome":"Joao","retirante_cpf":"123"}',
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("GET /events/:eventId/legacy-participants uses auth and path", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve("[]"); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "legacy-token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.getLegacyEventParticipants("ev-legacy")];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/events/ev-legacy/legacy-participants", expect.objectContaining({
                        headers: expect.objectContaining({
                            Authorization: "Bearer legacy-token",
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("POST /takeout/confirm/legacy sends participant and event ids", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve(JSON.stringify({ status: "CONFIRMED" })); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "legacy-token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.postLegacyTakeoutConfirm({
                            request_id: "req-legacy-1",
                            event_id: "ev-legacy",
                            participant_id: "lp-1",
                            device_id: "dev-1",
                        })];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/takeout/confirm/legacy", expect.objectContaining({
                        method: "POST",
                        body: JSON.stringify({
                            request_id: "req-legacy-1",
                            event_id: "ev-legacy",
                            participant_id: "lp-1",
                            device_id: "dev-1",
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
    it("POST /takeout/confirm/legacy sends payload_json when provided", function () { return __awaiter(void 0, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch.mockResolvedValueOnce({
                        ok: true,
                        text: function () { return Promise.resolve(JSON.stringify({ status: "CONFIRMED" })); },
                    });
                    client = (0, takeout_api_1.createTakeoutClient)({
                        baseUrl: baseUrl,
                        getAccessToken: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, "legacy-token"];
                        }); }); },
                    });
                    return [4 /*yield*/, client.postLegacyTakeoutConfirm({
                            request_id: "req-legacy-2",
                            event_id: "ev-legacy",
                            participant_id: "lp-1",
                            device_id: "dev-1",
                            payload_json: '{"retirada_por_terceiro":true,"retirante_nome":"Maria"}',
                        })];
                case 1:
                    _a.sent();
                    expect(global.fetch).toHaveBeenCalledWith("http://192.168.1.10:5555/takeout/confirm/legacy", expect.objectContaining({
                        method: "POST",
                        body: JSON.stringify({
                            request_id: "req-legacy-2",
                            event_id: "ev-legacy",
                            participant_id: "lp-1",
                            device_id: "dev-1",
                            payload_json: '{"retirada_por_terceiro":true,"retirante_nome":"Maria"}',
                        }),
                    }));
                    return [2 /*return*/];
            }
        });
    }); });
});
