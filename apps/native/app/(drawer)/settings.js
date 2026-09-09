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
exports.default = SettingsScreen;
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var expo_router_1 = require("expo-router");
var react_native_1 = require("react-native");
function SettingsScreen() {
    var _this = this;
    var router = (0, expo_router_1.useRouter)();
    var _a = (0, takeout_connection_context_1.useTakeoutConnection)(), isPaired = _a.isPaired, baseUrl = _a.baseUrl, clearConnection = _a.clearConnection;
    return (<ui_tamagui_1.ScreenContainer mode="static">
      <react_native_1.View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
        <react_native_1.Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 8 }}>
          Configurações
        </react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", marginBottom: 24 }}>
          Conexão e informações do app.
        </react_native_1.Text>

        {isPaired ? (<>
            <react_native_1.View style={{ marginBottom: 16 }}>
              <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 4 }}>Desktop</react_native_1.Text>
              <react_native_1.Text style={{ color: "#111827" }} numberOfLines={1} ellipsizeMode="middle">
                {baseUrl || "—"}
              </react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 16 }}/>
            <ui_tamagui_1.Button testID="settings-unpair" variant="bordered" onPress={function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, clearConnection()];
                        case 1:
                            _a.sent();
                            router.replace("/pair");
                            return [2 /*return*/];
                    }
                });
            }); }}>
              Desparear
            </ui_tamagui_1.Button>
          </>) : (<react_native_1.Text style={{ color: "#6b7280" }}>
            Não pareado. Use a tela inicial ou Parear para conectar ao desktop.
          </react_native_1.Text>)}
      </react_native_1.View>
    </ui_tamagui_1.ScreenContainer>);
}
