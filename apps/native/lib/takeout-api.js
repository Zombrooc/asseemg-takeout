"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.TakeoutApiError = void 0;
exports.createTakeoutClient = createTakeoutClient;
function ensureSlash(url) {
    return url.replace(/\/$/, "");
}
function createTakeoutClient(config) {
    var baseUrl = ensureSlash(config.baseUrl);
    function authHeaders() {
        return __awaiter(this, void 0, void 0, function () {
            var token, h;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, config.getAccessToken()];
                    case 1:
                        token = _a.sent();
                        h = { "Content-Type": "application/json" };
                        if (token)
                            h["Authorization"] = "Bearer ".concat(token);
                        return [2 /*return*/, h];
                }
            });
        });
    }
    function request(path, init) {
        return __awaiter(this, void 0, void 0, function () {
            var headers, _a, _b, res, bodyText;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(init === null || init === void 0 ? void 0 : init.skipAuth)) return [3 /*break*/, 1];
                        _a = __assign({ "Content-Type": "application/json" }, init === null || init === void 0 ? void 0 : init.headers);
                        return [3 /*break*/, 3];
                    case 1:
                        _b = [{}];
                        return [4 /*yield*/, authHeaders()];
                    case 2:
                        _a = __assign.apply(void 0, [__assign.apply(void 0, _b.concat([(_c.sent())])), init === null || init === void 0 ? void 0 : init.headers]);
                        _c.label = 3;
                    case 3:
                        headers = _a;
                        return [4 /*yield*/, fetch("".concat(baseUrl).concat(path), __assign(__assign({}, init), { headers: headers }))];
                    case 4:
                        res = _c.sent();
                        return [4 /*yield*/, res.text()];
                    case 5:
                        bodyText = _c.sent();
                        if (!res.ok)
                            throw new TakeoutApiError(res.status, bodyText);
                        return [2 /*return*/, JSON.parse(bodyText)];
                }
            });
        });
    }
    return {
        getHealth: function () { return request("/health", { skipAuth: true }); },
        getNetworkAddresses: function () { return request("/network/addresses", { skipAuth: true }); },
        getConnectionInfo: function () { return request("/pair/info", { skipAuth: true }); },
        pair: function (deviceId, pairingToken, operatorAlias) {
            return request("/pair", {
                method: "POST",
                skipAuth: true,
                body: JSON.stringify({
                    device_id: deviceId,
                    pairing_token: pairingToken,
                    operator_alias: operatorAlias,
                }),
            });
        },
        getEvents: function () { return request("/events"); },
        getEventParticipants: function (eventId) {
            return request("/events/".concat(encodeURIComponent(eventId), "/participants"));
        },
        getLegacyEventParticipants: function (eventId) {
            return request("/events/".concat(encodeURIComponent(eventId), "/legacy-participants"));
        },
        getLegacyReservedNumbers: function (eventId, includeUsed) {
            if (includeUsed === void 0) { includeUsed = false; }
            var q = includeUsed ? "?includeUsed=true" : "";
            return request("/events/".concat(encodeURIComponent(eventId), "/legacy-reservations").concat(q));
        },
        postLegacyReserveNumbers: function (eventId, payload) {
            return request("/events/".concat(encodeURIComponent(eventId), "/legacy-reservations"), {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        postLegacyCreateParticipant: function (eventId, payload) {
            return request("/events/".concat(encodeURIComponent(eventId), "/legacy-participants"), {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        searchEventParticipants: function (eventId, q, mode) {
            var params = new URLSearchParams({ q: q, mode: mode });
            return request("/events/".concat(encodeURIComponent(eventId), "/participants/search?").concat(params.toString()));
        },
        searchLegacyEventParticipants: function (eventId, q, mode) {
            var params = new URLSearchParams({ q: q, mode: mode });
            return request("/events/".concat(encodeURIComponent(eventId), "/legacy-participants/search?").concat(params.toString()));
        },
        postTakeoutConfirm: function (payload) {
            return request("/takeout/confirm", {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        postLegacyTakeoutConfirm: function (payload) {
            return request("/takeout/confirm/legacy", {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        getAudit: function (params) {
            if (!params.eventId) {
                throw new Error("eventId is required");
            }
            var q = new URLSearchParams();
            q.set("eventId", params.eventId);
            if (params === null || params === void 0 ? void 0 : params.status)
                q.set("status", params.status);
            if (params === null || params === void 0 ? void 0 : params.from)
                q.set("from", params.from);
            if (params === null || params === void 0 ? void 0 : params.to)
                q.set("to", params.to);
            var query = q.toString();
            return request("/audit".concat(query ? "?".concat(query) : ""));
        },
        postResetEventCheckins: function (eventId) {
            return request("/events/".concat(encodeURIComponent(eventId), "/checkins/reset"), {
                method: "POST",
            });
        },
        getSyncEvents: function (eventId, sinceSeq) {
            var params = new URLSearchParams({ eventId: eventId });
            if (sinceSeq != null)
                params.set("sinceSeq", String(sinceSeq));
            return request("/sync/events?".concat(params.toString()));
        },
        postLocksAcquire: function (participantId, deviceId) {
            return request("/locks", {
                method: "POST",
                body: JSON.stringify({ participantId: participantId, deviceId: deviceId }),
            });
        },
        postLocksRenew: function (participantId, deviceId) {
            return request("/locks/renew", {
                method: "POST",
                body: JSON.stringify({ participantId: participantId, deviceId: deviceId }),
            });
        },
        deleteLocksRelease: function (participantId, deviceId) {
            var params = deviceId ? "?deviceId=".concat(encodeURIComponent(deviceId)) : "";
            return request("/locks/".concat(encodeURIComponent(participantId)).concat(params), {
                method: "DELETE",
            });
        },
        getLocksStatus: function (participantId) {
            return request("/locks/".concat(encodeURIComponent(participantId)));
        },
    };
}
var TakeoutApiError = /** @class */ (function (_super) {
    __extends(TakeoutApiError, _super);
    function TakeoutApiError(status, body) {
        var _this = _super.call(this, "HTTP ".concat(status, ": ").concat(body)) || this;
        _this.status = status;
        _this.body = body;
        _this.name = "TakeoutApiError";
        return _this;
    }
    TakeoutApiError.prototype.getConflictBody = function () {
        if (this.status !== 409)
            return null;
        try {
            return JSON.parse(this.body);
        }
        catch (_a) {
            return null;
        }
    };
    return TakeoutApiError;
}(Error));
exports.TakeoutApiError = TakeoutApiError;
