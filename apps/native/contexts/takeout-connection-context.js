"use strict";
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
exports.TakeoutConnectionProvider = TakeoutConnectionProvider;
exports.useTakeoutConnection = useTakeoutConnection;
var native_1 = require("@pickup/env/native");
var SecureStore = require("expo-secure-store");
var react_1 = require("react");
var react_native_1 = require("react-native");
var takeout_api_1 = require("@/lib/takeout-api");
var HEALTH_CHECK_INTERVAL_MS = 15000;
var KEYS = {
    baseUrl: "takeout_base_url",
    accessToken: "takeout_access_token",
    deviceId: "takeout_device_id",
};
function generateDeviceId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
var defaultBaseUrl = native_1.env.EXPO_PUBLIC_SERVER_URL.replace(/\/$/, "");
var TakeoutConnectionContext = (0, react_1.createContext)(null);
function TakeoutConnectionProvider(_a) {
    var _this = this;
    var children = _a.children;
    var _b = (0, react_1.useState)({
        baseUrl: null,
        accessToken: null,
        deviceId: null,
        isPaired: false,
        isLoading: true,
        isReachable: false,
    }), state = _b[0], setState = _b[1];
    var checkInFlight = (0, react_1.useRef)(false);
    var loadStored = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, baseUrl, accessToken, deviceId, isPaired, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.all([
                            SecureStore.getItemAsync(KEYS.baseUrl),
                            SecureStore.getItemAsync(KEYS.accessToken),
                            SecureStore.getItemAsync(KEYS.deviceId),
                        ])];
                case 1:
                    _a = _c.sent(), baseUrl = _a[0], accessToken = _a[1], deviceId = _a[2];
                    isPaired = !!(baseUrl && accessToken && deviceId);
                    setState({
                        baseUrl: baseUrl,
                        accessToken: accessToken,
                        deviceId: deviceId,
                        isPaired: isPaired,
                        isLoading: false,
                        isReachable: false,
                    });
                    return [3 /*break*/, 3];
                case 2:
                    _b = _c.sent();
                    setState(function (s) { return (__assign(__assign({}, s), { isLoading: false })); });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }, []);
    var checkReachability = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        var url, res, data, ok_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    url = state.baseUrl;
                    if (!url || checkInFlight.current)
                        return [2 /*return*/];
                    checkInFlight.current = true;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch("".concat(url.replace(/\/$/, ""), "/health"), { method: "GET" })];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = (_b.sent());
                    ok_1 = res.ok && data.status === "ok";
                    setState(function (s) { return (s.baseUrl === url ? __assign(__assign({}, s), { isReachable: ok_1 }) : s); });
                    return [3 /*break*/, 6];
                case 4:
                    _a = _b.sent();
                    setState(function (s) { return (s.baseUrl === url ? __assign(__assign({}, s), { isReachable: false }) : s); });
                    return [3 /*break*/, 6];
                case 5:
                    checkInFlight.current = false;
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); }, [state.baseUrl]);
    (0, react_1.useEffect)(function () {
        if (!state.isPaired || !state.baseUrl) {
            setState(function (s) { return (s.isReachable ? __assign(__assign({}, s), { isReachable: false }) : s); });
            return;
        }
        checkReachability();
        var id = setInterval(checkReachability, HEALTH_CHECK_INTERVAL_MS);
        return function () { return clearInterval(id); };
    }, [state.isPaired, state.baseUrl]);
    (0, react_1.useEffect)(function () {
        var sub = react_native_1.AppState.addEventListener("change", function (next) {
            if (next === "active" && state.isPaired && state.baseUrl)
                checkReachability();
        });
        return function () { return sub.remove(); };
    }, [state.isPaired, state.baseUrl, checkReachability]);
    (0, react_1.useEffect)(function () {
        loadStored();
    }, [loadStored]);
    var setConnection = (0, react_1.useCallback)(function (baseUrl, accessToken, deviceId) { return __awaiter(_this, void 0, void 0, function () {
        var url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = baseUrl.replace(/\/$/, "");
                    return [4 /*yield*/, Promise.all([
                            SecureStore.setItemAsync(KEYS.baseUrl, url),
                            SecureStore.setItemAsync(KEYS.accessToken, accessToken),
                            SecureStore.setItemAsync(KEYS.deviceId, deviceId),
                        ])];
                case 1:
                    _a.sent();
                    setState({
                        baseUrl: url,
                        accessToken: accessToken,
                        deviceId: deviceId,
                        isPaired: true,
                        isLoading: false,
                        isReachable: true,
                    });
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var clearConnection = (0, react_1.useCallback)(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        SecureStore.deleteItemAsync(KEYS.baseUrl),
                        SecureStore.deleteItemAsync(KEYS.accessToken),
                        SecureStore.deleteItemAsync(KEYS.deviceId),
                    ])];
                case 1:
                    _a.sent();
                    setState({
                        baseUrl: null,
                        accessToken: null,
                        deviceId: null,
                        isPaired: false,
                        isLoading: false,
                        isReachable: false,
                    });
                    return [2 /*return*/];
            }
        });
    }); }, []);
    var api = (0, react_1.useMemo)(function () {
        if (!state.baseUrl || !state.accessToken || !state.deviceId)
            return null;
        return (0, takeout_api_1.createTakeoutClient)({
            baseUrl: state.baseUrl,
            getAccessToken: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, state.accessToken];
            }); }); },
        });
    }, [state.baseUrl, state.accessToken, state.deviceId]);
    var value = (0, react_1.useMemo)(function () { return (__assign(__assign({}, state), { setConnection: setConnection, clearConnection: clearConnection, checkReachability: checkReachability, api: api, defaultBaseUrl: defaultBaseUrl })); }, [state, setConnection, clearConnection, checkReachability, api]);
    return (<TakeoutConnectionContext.Provider value={value}>
      {children}
    </TakeoutConnectionContext.Provider>);
}
function useTakeoutConnection() {
    var ctx = (0, react_1.useContext)(TakeoutConnectionContext);
    if (!ctx)
        throw new Error("useTakeoutConnection must be used within TakeoutConnectionProvider");
    return ctx;
}
