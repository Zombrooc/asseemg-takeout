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
exports.default = Home;
var takeout_connection_context_1 = require("@/contexts/takeout-connection-context");
var react_query_1 = require("@tanstack/react-query");
var expo_router_1 = require("expo-router");
var home_1 = require("@/components/mobile-tamagui/home");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var react_native_1 = require("react-native");
function Home() {
    var _this = this;
    var _a;
    var router = (0, expo_router_1.useRouter)();
    var _b = (0, takeout_connection_context_1.useTakeoutConnection)(), isPaired = _b.isPaired, connectionLoading = _b.isLoading, isReachable = _b.isReachable, api = _b.api, baseUrl = _b.baseUrl, clearConnection = _b.clearConnection, checkReachability = _b.checkReachability;
    var eventsQuery = (0, react_query_1.useQuery)({
        queryKey: ["takeout-events"],
        queryFn: function () {
            return api ? api.getEvents() : Promise.reject(new Error("No API"));
        },
        enabled: !!api && isPaired && isReachable,
        refetchInterval: 15000,
    });
    if (connectionLoading && !isPaired) {
        return (<ui_tamagui_1.ScreenContainer mode="static">
        <react_native_1.View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ui_tamagui_1.Spinner size="large"/>
          <react_native_1.Text style={{ color: "#6b7280", marginTop: 12 }}>Conectando...</react_native_1.Text>
        </react_native_1.View>
      </ui_tamagui_1.ScreenContainer>);
    }
    if (!isPaired) {
        return (<ui_tamagui_1.ScreenContainer mode="static">
        <ui_tamagui_1.TopBar title="ASSEEMG Retira - Mobile"/>
        <react_native_1.View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <react_native_1.View style={{
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderRadius: 16,
                padding: 24,
                backgroundColor: "#f9fafb",
                marginBottom: 24,
            }}>
            <react_native_1.Text style={{ color: "#111827", fontWeight: "600", fontSize: 18, marginBottom: 8 }}>
              Sem conexão com o desktop
            </react_native_1.Text>
            <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
              Conecte ao app Takeout Desktop na mesma rede local para iniciar.
            </react_native_1.Text>
            <expo_router_1.Link href="/pair" asChild>
              <ui_tamagui_1.Button testID="home-pair-cta" width="100%">
                Parear com o Desktop
              </ui_tamagui_1.Button>
            </expo_router_1.Link>
          </react_native_1.View>
          <react_native_1.Text style={{ color: "#6b7280", fontSize: 14 }}>
            Escaneie o QR Code exibido no app desktop ou insira a URL manualmente.
          </react_native_1.Text>
        </react_native_1.View>
      </ui_tamagui_1.ScreenContainer>);
    }
    var events = (_a = eventsQuery.data) !== null && _a !== void 0 ? _a : [];
    var showEventsLoading = connectionLoading || eventsQuery.isLoading;
    return (<ui_tamagui_1.ScreenContainer mode="static">
      <ui_tamagui_1.TopBar title="ASSEEMG Retira - Mobile" subtitle="Eventos disponíveis" actionSlot={<react_native_1.Pressable onPress={function () { return router.push("/audit"); }} style={function (_a) {
            var pressed = _a.pressed;
            return ({ padding: 6, borderRadius: 8, opacity: pressed ? 0.7 : 1 });
        }} accessibilityLabel="Abrir auditoria">
            <Ionicons_1.default name="document-text-outline" size={22} color="#64748b"/>
          </react_native_1.Pressable>} rightSlot={<home_1.StatusPill isReachable={isReachable}/>}/>
      <react_native_1.View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: "#ffffff" }}>
        <home_1.ConnectionStatusCard isReachable={isReachable} isConnecting={connectionLoading} baseUrl={baseUrl} onRetry={function () { return checkReachability(); }} onDisconnect={function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, clearConnection()];
                    case 1:
                        _a.sent();
                        router.replace("/pair");
                        return [2 /*return*/];
                }
            });
        }); }}/>

        <react_native_1.View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8, marginBottom: 12, gap: 8 }}>
          <react_native_1.Text style={{ color: "#111827", fontWeight: "600", fontSize: 16, flexShrink: 1 }}>
            Eventos disponíveis
          </react_native_1.Text>
          <react_native_1.Text style={{ color: "#6b7280", fontSize: 14, flexShrink: 0 }}>
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </react_native_1.Text>
        </react_native_1.View>

        <home_1.EventsList isLoading={showEventsLoading} events={events} onOpenEvent={function (eventId) { return router.push("/(drawer)/events/".concat(eventId)); }} onPair={function () { return router.push("/pair"); }}/>
      </react_native_1.View>
    </ui_tamagui_1.ScreenContainer>);
}
