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
exports.TakeoutQueueProcessor = TakeoutQueueProcessor;
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var takeout_queue_1 = require("@/lib/takeout-queue");
var takeout_api_1 = require("@/lib/takeout-api");
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var RETRY_DELAY_MS = 3000;
var MAX_BACKOFF_MS = 60000;
function TakeoutQueueProcessor() {
    var _this = this;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _a = (0, takeout_connection_context_1.useTakeoutConnection)(), api = _a.api, deviceId = _a.deviceId, isReachable = _a.isReachable;
    var processing = (0, react_1.useRef)(false);
    var backoff = (0, react_1.useRef)(RETRY_DELAY_MS);
    (0, react_1.useEffect)(function () {
        if (!api || !deviceId || !isReachable)
            return;
        var cancelled = false;
        var process = function () { return __awaiter(_this, void 0, void 0, function () {
            var list, item, res, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (cancelled || processing.current)
                            return [2 /*return*/];
                        return [4 /*yield*/, (0, takeout_queue_1.getPendingQueue)()];
                    case 1:
                        list = _a.sent();
                        if (list.length === 0) {
                            if (!cancelled)
                                setTimeout(process, RETRY_DELAY_MS);
                            return [2 /*return*/];
                        }
                        processing.current = true;
                        item = list[0];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 11]);
                        return [4 /*yield*/, api.postTakeoutConfirm({
                                request_id: item.request_id,
                                ticket_id: item.ticket_id,
                                device_id: item.device_id,
                                payload_json: item.payload_json,
                            })];
                    case 3:
                        res = _a.sent();
                        if (!(res.status === "CONFIRMED" || res.status === "DUPLICATE")) return [3 /*break*/, 5];
                        return [4 /*yield*/, (0, takeout_queue_1.removeFromQueue)(item.request_id)];
                    case 4:
                        _a.sent();
                        queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
                        backoff.current = RETRY_DELAY_MS;
                        return [3 /*break*/, 6];
                    case 5:
                        backoff.current = Math.min(backoff.current * 1.5, MAX_BACKOFF_MS);
                        _a.label = 6;
                    case 6: return [3 /*break*/, 11];
                    case 7:
                        e_1 = _a.sent();
                        if (!(e_1 instanceof takeout_api_1.TakeoutApiError && e_1.status === 409)) return [3 /*break*/, 9];
                        return [4 /*yield*/, (0, takeout_queue_1.removeFromQueue)(item.request_id)];
                    case 8:
                        _a.sent();
                        queryClient.invalidateQueries({ queryKey: ["takeout-audit"] });
                        backoff.current = RETRY_DELAY_MS;
                        return [3 /*break*/, 10];
                    case 9:
                        backoff.current = Math.min(backoff.current * 1.5, MAX_BACKOFF_MS);
                        _a.label = 10;
                    case 10: return [3 /*break*/, 11];
                    case 11:
                        processing.current = false;
                        if (!cancelled)
                            setTimeout(process, backoff.current);
                        return [2 /*return*/];
                }
            });
        }); };
        var id = setTimeout(process, RETRY_DELAY_MS);
        return function () {
            cancelled = true;
            clearTimeout(id);
        };
    }, [api, deviceId, isReachable, queryClient]);
    return null;
}
