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
exports.Route = void 0;
var react_router_1 = require("@tanstack/react-router");
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var event_card_1 = require("@/components/event-card");
var pairing_section_1 = require("@/components/pairing-section");
var status_card_1 = require("@/components/status-card");
var collapsible_1 = require("@/components/ui/collapsible");
var takeout_api_1 = require("@/lib/takeout-api");
var format_date_1 = require("@/lib/format-date");
var utils_1 = require("@/lib/utils");
var sonner_1 = require("sonner");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
function pairingUrl(baseUrl, token) {
    var u = new URL(baseUrl);
    u.searchParams.set("token", token);
    return u.toString();
}
exports.Route = (0, react_router_1.createFileRoute)("/")({
    component: DashboardPage,
});
function DashboardPage() {
    var _this = this;
    var _a, _b, _c, _d;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _e = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "events"],
        queryFn: function () { return (0, takeout_api_1.getEvents)(true); },
        refetchInterval: 15000,
    }), _f = _e.data, events = _f === void 0 ? [] : _f, isLoading = _e.isLoading;
    var health = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "health"],
        queryFn: takeout_api_1.getHealth,
        refetchInterval: 10000,
    }).data;
    var networkAddresses = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "network-addresses"],
        queryFn: takeout_api_1.getNetworkAddresses,
        refetchInterval: 30000,
    }).data;
    var _g = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "connectionInfo"],
        queryFn: takeout_api_1.getConnectionInfo,
        refetchInterval: 5000,
    }), connectionInfo = _g.data, connectionLoading = _g.isLoading;
    var renewMutation = (0, react_query_1.useMutation)({
        mutationFn: takeout_api_1.renewPairingToken,
        onSuccess: function (info) {
            queryClient.setQueryData(["takeout", "connectionInfo"], info);
            sonner_1.toast.success("Token renovado");
        },
        onError: function () { return sonner_1.toast.error("Falha ao renovar token"); },
    });
    var activeEvents = events.filter(function (e) { return !e.archivedAt; });
    var archivedEvents = events.filter(function (e) { return e.archivedAt; });
    var handleArchive = function (event) { return __awaiter(_this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, takeout_api_1.postEventArchive)(event.eventId)];
                case 1:
                    _a.sent();
                    queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
                    sonner_1.toast.success("Evento arquivado");
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    sonner_1.toast.error(e_1 instanceof Error ? e_1.message : "Erro ao arquivar");
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var handleUnarchive = function (event) { return __awaiter(_this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, (0, takeout_api_1.postEventUnarchive)(event.eventId)];
                case 1:
                    _a.sent();
                    queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
                    sonner_1.toast.success("Evento desarquivado");
                    return [3 /*break*/, 3];
                case 2:
                    e_2 = _a.sent();
                    sonner_1.toast.error(e_2 instanceof Error ? e_2.message : "Erro ao desarquivar");
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function (event) { return __awaiter(_this, void 0, void 0, function () {
        var name, e_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    name = (_a = event.name) !== null && _a !== void 0 ? _a : event.eventId;
                    if (!window.confirm("Apagar o evento \"".concat(name, "\" e todos os participantes?")))
                        return [2 /*return*/];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, takeout_api_1.deleteEvent)(event.eventId)];
                case 2:
                    _b.sent();
                    queryClient.invalidateQueries({ queryKey: ["takeout", "events"] });
                    sonner_1.toast.success("Evento apagado");
                    return [3 /*break*/, 4];
                case 3:
                    e_3 = _b.sent();
                    sonner_1.toast.error(e_3 instanceof Error ? e_3.message : "Erro ao apagar");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var serverOk = (health === null || health === void 0 ? void 0 : health.status) === "ok";
    var primaryAddress = (_d = (_c = (_b = (_a = networkAddresses === null || networkAddresses === void 0 ? void 0 : networkAddresses.addresses) === null || _a === void 0 ? void 0 : _a.find(function (a) { return a.isPrimary; })) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : networkAddresses === null || networkAddresses === void 0 ? void 0 : networkAddresses.baseUrl) !== null && _d !== void 0 ? _d : "—";
    var pairingUrlValue = connectionInfo != null
        ? pairingUrl(connectionInfo.baseUrl, connectionInfo.pairingToken)
        : "";
    var autoRenewCooldownMs = 10000;
    var lastAutoRenewAtRef = (0, react_1.useRef)(0);
    var renewToken = renewMutation.mutate;
    var isPairingTokenExpired = connectionInfo != null &&
        Number(connectionInfo.expiresAt) > 0 &&
        Number(connectionInfo.expiresAt) <= Math.floor(Date.now() / 1000);
    (0, react_1.useEffect)(function () {
        if (!isPairingTokenExpired || renewMutation.isPending)
            return;
        var now = Date.now();
        if (now - lastAutoRenewAtRef.current < autoRenewCooldownMs)
            return;
        lastAutoRenewAtRef.current = now;
        renewToken();
    }, [isPairingTokenExpired, renewMutation.isPending, renewToken]);
    return (<main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg bg-muted/30 p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Status do Sistema</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <status_card_1.StatusCard title="Servidor" status={serverOk ? "connected" : "disconnected"} value={serverOk ? "127.0.0.1:5555" : "Desconectado"} description="API Axum ativa" icon={<lucide_react_1.Server className="size-6 text-muted-foreground" aria-hidden/>}/>
          <status_card_1.StatusCard title="Rede" status={serverOk ? "connected" : "pending"} value={primaryAddress} description="Endereço para pareamento" icon={<lucide_react_1.Wifi className="size-6 text-muted-foreground" aria-hidden/>}/>
        </div>
      </section>

      <section className="rounded-lg bg-muted/30 p-4 sm:p-6">
        {connectionLoading || !connectionInfo ? (<div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Carregando...
          </div>) : (<pairing_section_1.PairingSection pairingUrl={pairingUrlValue} expiresAt={connectionInfo.expiresAt} onRenewToken={function () { return renewMutation.mutate(); }} isRenewing={renewMutation.isPending}/>)}
      </section>

      {(isLoading || events.length > 0) && (<section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Eventos Importados</h2>
            <react_router_1.Link to="/import" className={(0, utils_1.cn)((0, button_1.buttonVariants)({ size: "sm" }), "inline-flex items-center gap-1.5")}>
              <lucide_react_1.Plus className="size-4" aria-hidden/>
              Novo Evento
            </react_router_1.Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (<p className="text-sm text-muted-foreground">
                Carregando eventos...
              </p>) : (activeEvents.map(function (event) {
                var _a;
                return (<event_card_1.EventCard key={event.eventId} eventId={event.eventId} name={(_a = event.name) !== null && _a !== void 0 ? _a : event.eventId} date={event.startTime
                        ? "".concat(event.startTime, " \u00B7 ").concat((0, format_date_1.formatDateBR)(event.startDate))
                        : (0, format_date_1.formatDateBR)(event.startDate)} participantCount={0} archived={false} onArchive={function () { return handleArchive(event); }} onDelete={function () { return handleDelete(event); }}/>);
            }))}
          </div>

          {!isLoading && archivedEvents.length > 0 && (<collapsible_1.Collapsible className="mt-8">
              <collapsible_1.CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-3 text-left font-medium hover:bg-muted/50">
                Arquivo
                <lucide_react_1.ChevronDown className="size-4 shrink-0 transition-transform [[data-state=open]_&]:rotate-180" aria-hidden/>
              </collapsible_1.CollapsibleTrigger>
              <collapsible_1.CollapsibleContent>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedEvents.map(function (event) {
                    var _a;
                    return (<event_card_1.EventCard key={event.eventId} eventId={event.eventId} name={(_a = event.name) !== null && _a !== void 0 ? _a : event.eventId} date={event.startTime
                            ? "".concat(event.startTime, " \u00B7 ").concat((0, format_date_1.formatDateBR)(event.startDate))
                            : (0, format_date_1.formatDateBR)(event.startDate)} participantCount={0} archived onUnarchive={function () { return handleUnarchive(event); }} onDelete={function () { return handleDelete(event); }}/>);
                })}
                </div>
              </collapsible_1.CollapsibleContent>
            </collapsible_1.Collapsible>)}
        </section>)}
    </main>);
}
