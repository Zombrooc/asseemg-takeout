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
exports.normalizeSearchValue = normalizeSearchValue;
exports.participantMatchesSearch = participantMatchesSearch;
exports.getTicketTypeOptions = getTicketTypeOptions;
exports.resolveInitialTicketType = resolveInitialTicketType;
exports.getTodayIsoDate = getTodayIsoDate;
exports.isBirthDateInAllowedRange = isBirthDateInAllowedRange;
exports.getParticipantStats = getParticipantStats;
exports.mapLegacyToEventParticipant = mapLegacyToEventParticipant;
var react_router_1 = require("@tanstack/react-router");
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var event_summary_1 = require("@/components/event-summary");
var participants_table_1 = require("@/components/participants-table");
var reserved_numbers_collapsible_1 = require("@/components/takeout/reserved-numbers-collapsible");
var export_event_participants_button_1 = require("@/components/takeout/export-event-participants-button");
var breadcrumb_nav_1 = require("@/components/breadcrumb-nav");
var utils_1 = require("@/lib/utils");
var format_date_1 = require("@/lib/format-date");
var fuse_js_1 = require("fuse.js");
var legacy_participant_alerts_1 = require("@pickup/api/legacy-participant-alerts");
var takeout_api_1 = require("@/lib/takeout-api");
var use_takeout_ws_1 = require("@/lib/use-takeout-ws");
var sonner_1 = require("sonner");
var lucide_react_1 = require("lucide-react");
var isDev = import.meta.env.DEV;
exports.Route = (0, react_router_1.createFileRoute)("/events/$eventId")({
    component: EventDetailPage,
});
function normalizeSearchValue(value) {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
function participantMatchesSearch(participant, query) {
    var normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery)
        return true;
    // Busca por CPF apenas com dígitos (ex: usuário digita "12345678" sem pontos/traços)
    var queryDigits = query.replace(/\D/g, "");
    if (queryDigits.length >= 3 && participant.cpf) {
        var cpfDigits = participant.cpf.replace(/\D/g, "");
        if (cpfDigits.includes(queryDigits))
            return true;
    }
    var values = [
        participant.name,
        participant.cpf,
        participant.birthDate,
        participant.ticketId,
        participant.sourceTicketId,
        participant.qrCode,
        participant.ticketName,
        participant.bibNumber != null ? String(participant.bibNumber) : null,
    ];
    return values.some(function (value) {
        if (value == null)
            return false;
        return normalizeSearchValue(String(value)).includes(normalizedQuery);
    });
}
function getTicketTypeOptions(participants) {
    var _a;
    var options = new Set();
    for (var _i = 0, participants_1 = participants; _i < participants_1.length; _i++) {
        var participant = participants_1[_i];
        var value = (_a = participant.ticketName) === null || _a === void 0 ? void 0 : _a.trim();
        if (value)
            options.add(value);
    }
    return Array.from(options).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
}
function resolveInitialTicketType(participant, ticketTypeOptions) {
    var _a, _b;
    var currentTicketType = (_a = participant.ticketName) === null || _a === void 0 ? void 0 : _a.trim();
    if (currentTicketType && ticketTypeOptions.includes(currentTicketType)) {
        return currentTicketType;
    }
    return (_b = ticketTypeOptions[0]) !== null && _b !== void 0 ? _b : "";
}
function getTodayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}
function isBirthDateInAllowedRange(value, minDate, maxDate) {
    if (minDate === void 0) { minDate = "1900-01-01"; }
    if (maxDate === void 0) { maxDate = getTodayIsoDate(); }
    var normalized = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized))
        return false;
    if (normalized < minDate || normalized > maxDate)
        return false;
    var parsed = new Date("".concat(normalized, "T00:00:00Z"));
    if (Number.isNaN(parsed.getTime()))
        return false;
    return parsed.toISOString().slice(0, 10) === normalized;
}
function getParticipantStats(participants) {
    var total = participants.length;
    var confirmed = participants.filter(function (p) { return p.checkinDone; }).length;
    return {
        total: total,
        confirmed: confirmed,
        pending: Math.max(total - confirmed, 0),
    };
}
function EventDetailPage() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f;
    var eventId = exports.Route.useParams().eventId;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _g = (0, react_1.useState)(""), searchQuery = _g[0], setSearchQuery = _g[1];
    var _h = (0, react_1.useState)(null), confirmingParticipant = _h[0], setConfirmingParticipant = _h[1];
    var _j = (0, react_1.useState)(null), editingParticipant = _j[0], setEditingParticipant = _j[1];
    var _k = (0, react_1.useState)(""), editName = _k[0], setEditName = _k[1];
    var _l = (0, react_1.useState)(""), editCpf = _l[0], setEditCpf = _l[1];
    var _m = (0, react_1.useState)(""), editBirthDate = _m[0], setEditBirthDate = _m[1];
    var _o = (0, react_1.useState)(""), editTicketType = _o[0], setEditTicketType = _o[1];
    var _p = (0, react_1.useState)(""), editShirtSize = _p[0], setEditShirtSize = _p[1];
    var _q = (0, react_1.useState)(""), editTeam = _q[0], setEditTeam = _q[1];
    var _r = (0, react_1.useState)(""), reserveStart = _r[0], setReserveStart = _r[1];
    var _s = (0, react_1.useState)(""), reserveEnd = _s[0], setReserveEnd = _s[1];
    var _t = (0, react_1.useState)(""), reserveLabel = _t[0], setReserveLabel = _t[1];
    var _u = (0, react_1.useState)(false), isReservedListOpen = _u[0], setIsReservedListOpen = _u[1];
    var _v = (0, react_1.useState)(false), createModalOpen = _v[0], setCreateModalOpen = _v[1];
    var _w = (0, react_1.useState)(null), createReservationId = _w[0], setCreateReservationId = _w[1];
    var _x = (0, react_1.useState)(""), createName = _x[0], setCreateName = _x[1];
    var _y = (0, react_1.useState)(""), createCpf = _y[0], setCreateCpf = _y[1];
    var _z = (0, react_1.useState)(""), createBirthDate = _z[0], setCreateBirthDate = _z[1];
    var _0 = (0, react_1.useState)(""), createTicketType = _0[0], setCreateTicketType = _0[1];
    var _1 = (0, react_1.useState)(""), createShirtSize = _1[0], setCreateShirtSize = _1[1];
    var _2 = (0, react_1.useState)(""), createTeam = _2[0], setCreateTeam = _2[1];
    var _3 = (0, react_1.useState)(""), createSex = _3[0], setCreateSex = _3[1];
    var minBirthDate = "1900-01-01";
    var maxBirthDate = (0, react_1.useMemo)(function () { return getTodayIsoDate(); }, []);
    (0, use_takeout_ws_1.useTakeoutWs)(eventId);
    var _4 = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "events"],
        queryFn: function () { return (0, takeout_api_1.getEvents)(true); },
    }).data, events = _4 === void 0 ? [] : _4;
    var eventSummary = events.find(function (e) { return e.eventId === eventId; });
    var eventName = (_a = eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.name) !== null && _a !== void 0 ? _a : eventId;
    var _5 = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "events", eventId, "participants"],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!((eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv")) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, takeout_api_1.getLegacyEventParticipants)(eventId)];
                    case 1:
                        rows = _a.sent();
                        return [2 /*return*/, rows.map(mapLegacyToEventParticipant)];
                    case 2: return [2 /*return*/, (0, takeout_api_1.getEventParticipants)(eventId)];
                }
            });
        }); },
        refetchInterval: 10000,
    }), _6 = _5.data, participants = _6 === void 0 ? [] : _6, isLoading = _5.isLoading, refetch = _5.refetch;
    var _7 = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "events", eventId, "legacy-reservations"],
        queryFn: function () { return (0, takeout_api_1.getLegacyReservedNumbers)(eventId); },
        enabled: (eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv",
        refetchInterval: 10000,
    }), _8 = _7.data, reservedNumbers = _8 === void 0 ? [] : _8, reservedLoading = _7.isLoading;
    var confirmMutation = (0, react_query_1.useMutation)({
        mutationFn: function (p) {
            return (eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv"
                ? (0, takeout_api_1.postLegacyTakeoutConfirm)({
                    request_id: crypto.randomUUID(),
                    event_id: eventId,
                    participant_id: p.id,
                    device_id: "web-dashboard",
                })
                : (0, takeout_api_1.postTakeoutConfirm)({
                    request_id: crypto.randomUUID(),
                    ticket_id: p.ticketId,
                    device_id: "web-dashboard",
                });
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
            sonner_1.toast.success("Check-in confirmado");
        },
        onError: function (err) { return sonner_1.toast.error(err instanceof Error ? err.message : "Erro ao confirmar"); },
    });
    var undoMutation = (0, react_query_1.useMutation)({
        mutationFn: function (p) {
            return (eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv"
                ? (0, takeout_api_1.postLegacyTakeoutUndo)({
                    request_id: crypto.randomUUID(),
                    event_id: eventId,
                    participant_id: p.id,
                    device_id: "web-dashboard",
                })
                : (0, takeout_api_1.postTakeoutUndo)({
                    request_id: crypto.randomUUID(),
                    ticket_id: p.ticketId,
                    device_id: "web-dashboard",
                });
        },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
            sonner_1.toast.success("Check-in desfeito");
        },
        onError: function (err) { return sonner_1.toast.error(err instanceof Error ? err.message : "Erro ao desfazer"); },
    });
    var editMutation = (0, react_query_1.useMutation)({
        mutationFn: function (p) { return __awaiter(_this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        payload = {
                            name: editName.trim(),
                            cpf: editCpf.trim(),
                            birthDate: editBirthDate.trim(),
                            ticketType: editTicketType.trim(),
                            shirtSize: editShirtSize.trim(),
                            team: editTeam.trim(),
                        };
                        if (!((eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv")) return [3 /*break*/, 2];
                        return [4 /*yield*/, (0, takeout_api_1.putLegacyEventParticipant)(eventId, p.id, payload)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, (0, takeout_api_1.putEventParticipant)(eventId, p.id, payload)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
            setEditingParticipant(null);
            sonner_1.toast.success("Participante atualizado");
        },
        onError: function (err) {
            var message = err instanceof Error ? err.message : "Erro ao editar participante";
            if (message.includes("HTTP 409")) {
                sonner_1.toast.error("Participante ja confirmado nao pode ser editado");
                return;
            }
            if (message.includes("HTTP 400")) {
                sonner_1.toast.error("Dados invalidos. Confira nome, cpf, data e tipo de ingresso.");
                return;
            }
            sonner_1.toast.error(message);
        },
    });
    var reserveMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var start, end, label, numbers, i;
            return __generator(this, function (_a) {
                start = Number(reserveStart);
                end = Number(reserveEnd || reserveStart);
                if (!Number.isFinite(start) || !Number.isFinite(end)) {
                    throw new Error("Informe números válidos para a reserva.");
                }
                if (start <= 0 || end <= 0) {
                    throw new Error("Os números devem ser maiores que zero.");
                }
                if (end < start) {
                    throw new Error("O número final não pode ser menor que o inicial.");
                }
                label = reserveLabel.trim() || null;
                numbers = [];
                for (i = start; i <= end; i += 1) {
                    numbers.push({ bibNumber: i, label: label });
                }
                return [2 /*return*/, (0, takeout_api_1.postLegacyReserveNumbers)(eventId, { numbers: numbers })];
            });
        }); },
        onSuccess: function (res) {
            var _a, _b;
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "legacy-reservations"] });
            var created = (_a = res.created) !== null && _a !== void 0 ? _a : 0;
            var skipped = (_b = res.skipped) !== null && _b !== void 0 ? _b : 0;
            sonner_1.toast.success("Reservas criadas: ".concat(created).concat(skipped ? " (puladas: ".concat(skipped, ")") : ""));
            setReserveStart("");
            setReserveEnd("");
            setReserveLabel("");
        },
        onError: function (err) { return sonner_1.toast.error(err instanceof Error ? err.message : "Erro ao criar reservas"); },
    });
    var createParticipantMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                if (createReservationId == null) {
                    throw new Error("Selecione um número reservado.");
                }
                if (!createName.trim()) {
                    throw new Error("Nome é obrigatório.");
                }
                if (!createCpf.trim()) {
                    throw new Error("CPF é obrigatório.");
                }
                if (!isBirthDateInAllowedRange(createBirthDate, minBirthDate, maxBirthDate)) {
                    throw new Error("Data de nascimento inv\u00E1lida. Use uma data entre ".concat(minBirthDate, " e ").concat(maxBirthDate, "."));
                }
                if (!createTicketType.trim()) {
                    throw new Error("Tipo de ingresso é obrigatório.");
                }
                payload = {
                    reservationId: createReservationId,
                    name: createName.trim(),
                    cpf: createCpf.trim(),
                    birthDate: createBirthDate.trim(),
                    ticketType: createTicketType.trim(),
                    shirtSize: createShirtSize.trim() ? createShirtSize.trim() : null,
                    team: createTeam.trim() ? createTeam.trim() : null,
                    sex: createSex.trim() ? createSex.trim() : null,
                };
                return [2 /*return*/, (0, takeout_api_1.postLegacyCreateParticipant)(eventId, payload)];
            });
        }); },
        onSuccess: function () {
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "participants"] });
            queryClient.invalidateQueries({ queryKey: ["takeout", "events", eventId, "legacy-reservations"] });
            sonner_1.toast.success("Participante criado");
            setCreateModalOpen(false);
        },
        onError: function (err) { return sonner_1.toast.error(err instanceof Error ? err.message : "Erro ao criar participante"); },
    });
    var ticketTypeOptions = (0, react_1.useMemo)(function () { return getTicketTypeOptions(participants); }, [participants]);
    (0, react_1.useEffect)(function () {
        var _a, _b, _c, _d, _e;
        if (!editingParticipant)
            return;
        setEditName((_a = editingParticipant.name) !== null && _a !== void 0 ? _a : "");
        setEditCpf((_b = editingParticipant.cpf) !== null && _b !== void 0 ? _b : "");
        setEditBirthDate((_c = editingParticipant.birthDate) !== null && _c !== void 0 ? _c : "");
        setEditTicketType(resolveInitialTicketType(editingParticipant, ticketTypeOptions));
        setEditShirtSize((_d = editingParticipant.shirtSize) !== null && _d !== void 0 ? _d : "");
        setEditTeam((_e = editingParticipant.team) !== null && _e !== void 0 ? _e : "");
    }, [editingParticipant, ticketTypeOptions]);
    var openCreateModal = function () {
        var _a, _b, _c;
        setCreateReservationId((_b = (_a = reservedNumbers[0]) === null || _a === void 0 ? void 0 : _a.bibNumber) !== null && _b !== void 0 ? _b : null);
        setCreateName("");
        setCreateCpf("");
        setCreateBirthDate("");
        setCreateTicketType((_c = ticketTypeOptions[0]) !== null && _c !== void 0 ? _c : "");
        setCreateShirtSize("");
        setCreateTeam("");
        setCreateSex("");
        setCreateModalOpen(true);
    };
    var fuse = (0, react_1.useMemo)(function () {
        return new fuse_js_1.default(participants, {
            keys: ["name"],
            threshold: 0.4,
            includeScore: false,
        });
    }, [participants]);
    var filteredParticipants = (0, react_1.useMemo)(function () {
        if (!searchQuery.trim())
            return participants;
        // Passo rápido: match exato/parcial (CPF, número de peito, ingresso, etc.)
        var exactMatches = participants.filter(function (p) { return participantMatchesSearch(p, searchQuery); });
        if (exactMatches.length > 0)
            return exactMatches;
        // Fallback: busca fuzzy por nome (tolera typos), mínimo 3 chars
        if (normalizeSearchValue(searchQuery).length >= 3) {
            return fuse.search(searchQuery).map(function (r) { return r.item; });
        }
        return [];
    }, [participants, searchQuery, fuse]);
    var realStats = (0, react_1.useMemo)(function () { return getParticipantStats(participants); }, [participants]);
    var participantAlertMap = (0, react_1.useMemo)(function () { return ((eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv" ? (0, legacy_participant_alerts_1.buildLegacyParticipantAlertMap)(participants) : {}); }, [eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType, participants]);
    var confirmingParticipantAlerts = confirmingParticipant ? (_b = participantAlertMap[confirmingParticipant.id]) !== null && _b !== void 0 ? _b : [] : [];
    var handleSaveEdit = function () {
        if (!editingParticipant)
            return;
        if (!isBirthDateInAllowedRange(editBirthDate, minBirthDate, maxBirthDate)) {
            sonner_1.toast.error("Data de nascimento invalida. Use uma data entre ".concat(minBirthDate, " e ").concat(maxBirthDate, "."));
            return;
        }
        if (!editTicketType.trim()) {
            sonner_1.toast.error("Tipo de ingresso e obrigatorio.");
            return;
        }
        editMutation.mutate(editingParticipant);
    };
    return (<main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <breadcrumb_nav_1.BreadcrumbNav items={[
            { label: "Dashboard", href: "/" },
            { label: eventName, href: "/events/".concat(eventId) },
            { label: "Participantes" },
        ]}/>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <react_router_1.Link to="/" className={(0, utils_1.cn)((0, button_1.buttonVariants)({ variant: "ghost", size: "icon" }))} aria-label="Voltar">
            <lucide_react_1.ArrowLeft className="size-4"/>
          </react_router_1.Link>
          <h1 className="text-2xl font-bold">{eventName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv" ? (<button_1.Button size="sm" onClick={openCreateModal}>
              Cadastrar participante
            </button_1.Button>) : null}
          <export_event_participants_button_1.ExportEventParticipantsButton eventId={eventId} eventName={eventName} participants={participants} sourceType={(_c = eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) !== null && _c !== void 0 ? _c : "json_sync"} disabled={isLoading}/>
          <button_1.Button variant="outline" size="sm" onClick={function () { return refetch(); }} disabled={isLoading} aria-label="Atualizar lista">
            <lucide_react_1.RefreshCw className={(0, utils_1.cn)("size-4", isLoading && "animate-spin")} aria-hidden/>
            Atualizar
          </button_1.Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <lucide_react_1.Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden/>
        <input_1.Input placeholder="Buscar por nome, CPF ou ingresso..." value={searchQuery} onChange={function (e) { return setSearchQuery(e.target.value); }} className="pl-8 pr-8" aria-label="Buscar participante"/>
        {searchQuery.trim() ? (<button type="button" onClick={function () { return setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca">
            <lucide_react_1.X className="size-4"/>
          </button>) : null}
      </div>

      {isLoading ? (<p className="text-sm text-muted-foreground">Carregando participantes...</p>) : (<>
          <event_summary_1.EventSummary totalParticipants={filteredParticipants.length} confirmedCount={realStats.confirmed} pendingCount={realStats.pending} rateBaseTotal={realStats.total}/>
          {(eventSummary === null || eventSummary === void 0 ? void 0 : eventSummary.sourceType) === "legacy_csv" ? (<div className="space-y-4">
              <card_1.Card>
                <card_1.CardHeader>
                  <card_1.CardTitle className="text-lg">Reservas de número</card_1.CardTitle>
                </card_1.CardHeader>
                <card_1.CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <label_1.Label htmlFor="reserve-start">Número inicial</label_1.Label>
                      <input_1.Input id="reserve-start" type="number" inputMode="numeric" value={reserveStart} onChange={function (e) { return setReserveStart(e.target.value); }} placeholder="Ex.: 16"/>
                    </div>
                    <div className="space-y-2">
                      <label_1.Label htmlFor="reserve-end">Número final</label_1.Label>
                      <input_1.Input id="reserve-end" type="number" inputMode="numeric" value={reserveEnd} onChange={function (e) { return setReserveEnd(e.target.value); }} placeholder="Ex.: 75"/>
                    </div>
                    <div className="space-y-2">
                      <label_1.Label htmlFor="reserve-label">Etiqueta / Equipe (opcional)</label_1.Label>
                      <input_1.Input id="reserve-label" value={reserveLabel} onChange={function (e) { return setReserveLabel(e.target.value); }} placeholder="Ex.: TIA GLEIDA"/>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button_1.Button onClick={function () { return reserveMutation.mutate(); }} disabled={reserveMutation.isPending}>
                      {reserveMutation.isPending ? "Salvando..." : "Adicionar reservas"}
                    </button_1.Button>
                    <p className="text-sm text-muted-foreground">
                      {reservedLoading ? "Carregando reservas..." : "".concat(reservedNumbers.length, " dispon\u00EDveis")}
                    </p>
                  </div>
                  {reservedNumbers.length > 0 ? (<reserved_numbers_collapsible_1.ReservedNumbersCollapsible reservedNumbers={reservedNumbers} isOpen={isReservedListOpen} onOpenChange={setIsReservedListOpen}/>) : (<p className="text-sm text-muted-foreground">
                      Nenhuma reserva disponível. Adicione uma faixa para liberar números.
                    </p>)}
                </card_1.CardContent>
              </card_1.Card>
            </div>) : null}
          <participants_table_1.ParticipantsTable eventName={eventName} participants={filteredParticipants} participantAlerts={participantAlertMap} onConfirm={function (p) { return setConfirmingParticipant(p); }} onUndo={function (p) {
                var _a;
                var label = (_a = p.name) !== null && _a !== void 0 ? _a : p.ticketId;
                if (!window.confirm("Desfazer check-in de \"".concat(label, "\"?")))
                    return;
                undoMutation.mutate(p);
            }} onEdit={function (p) { return setEditingParticipant(p); }} isConfirming={confirmMutation.isPending} isUndoing={undoMutation.isPending} isEditing={editMutation.isPending} showQrColumn={isDev}/>
        </>)}

      {editingParticipant ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Editar participante</h2>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-name">Nome</label_1.Label>
              <input_1.Input id="edit-name" value={editName} onChange={function (e) { return setEditName(e.target.value); }} placeholder="Nome do participante"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-birth-date">Data de nascimento</label_1.Label>
              <input_1.Input id="edit-birth-date" type="date" value={editBirthDate} onChange={function (e) { return setEditBirthDate(e.target.value); }} min={minBirthDate} max={maxBirthDate}/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-cpf">CPF</label_1.Label>
              <input_1.Input id="edit-cpf" value={editCpf} onChange={function (e) { return setEditCpf(e.target.value); }} placeholder="CPF"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-ticket-type">Tipo de ingresso</label_1.Label>
              <input_1.Input id="edit-ticket-type" aria-label="Tipo de ingresso" value={editTicketType} list="ticket-type-options" onChange={function (e) { return setEditTicketType(e.target.value); }} placeholder="Ex.: 5KM, 10KM, Kids..."/>
              <datalist id="ticket-type-options">
                {ticketTypeOptions.map(function (option) { return (<option key={option} value={option}>
                    {option}
                  </option>); })}
              </datalist>
              {ticketTypeOptions.length === 0 ? (<p className="text-sm text-muted-foreground">
                  Nenhuma sugestao disponivel; voce pode digitar um valor customizado.
                </p>) : null}
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-shirt-size">Tamanho da camisa</label_1.Label>
              <input_1.Input id="edit-shirt-size" value={editShirtSize} onChange={function (e) { return setEditShirtSize(e.target.value); }} placeholder="Ex.: P, M, G, GG"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="edit-team">Equipe</label_1.Label>
              <input_1.Input id="edit-team" value={editTeam} onChange={function (e) { return setEditTeam(e.target.value); }} placeholder="Nome da equipe"/>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button_1.Button variant="ghost" onClick={function () { return setEditingParticipant(null); }} disabled={editMutation.isPending}>
                Cancelar
              </button_1.Button>
              <button_1.Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
                {editMutation.isPending ? "Salvando..." : "Salvar"}
              </button_1.Button>
            </div>
          </div>
        </div>) : null}

      {confirmingParticipant ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-xl">
            <h2 id="confirm-modal-title" className="text-lg font-semibold">
              Confirmar retirada
            </h2>
            {confirmingParticipantAlerts.length > 0 ? (<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <lucide_react_1.TriangleAlert className="size-4" aria-hidden/>
                  Alertas para este participante
                </div>
                <ul className="space-y-1">
                  {confirmingParticipantAlerts.map(function (alert) { return (<li key={"".concat(confirmingParticipant.id, "-").concat(alert.code, "-").concat(alert.message)}>{alert.message}</li>); })}
                </ul>
              </div>) : null}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{(_d = confirmingParticipant.name) !== null && _d !== void 0 ? _d : "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">CPF</dt>
                <dd className="font-mono">{(0, participants_table_1.formatCpf)(confirmingParticipant.cpf)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Data de Nascimento</dt>
                <dd className="font-mono">{(0, format_date_1.formatBirthDateBR)(confirmingParticipant.birthDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Número de Peito</dt>
                <dd className="font-mono tabular-nums">
                  {confirmingParticipant.bibNumber != null ? confirmingParticipant.bibNumber : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Equipe</dt>
                <dd>{(_e = confirmingParticipant.team) !== null && _e !== void 0 ? _e : "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Camisa</dt>
                <dd>{(_f = confirmingParticipant.shirtSize) !== null && _f !== void 0 ? _f : "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ingresso</dt>
                <dd>{(0, participants_table_1.resolveDisplayTicket)(confirmingParticipant)}</dd>
              </div>
            </dl>
            <div className="flex items-center justify-end gap-2">
              <button_1.Button variant="ghost" onClick={function () { return setConfirmingParticipant(null); }} disabled={confirmMutation.isPending}>
                Cancelar
              </button_1.Button>
              <button_1.Button onClick={function () {
                confirmMutation.mutate(confirmingParticipant, {
                    onSettled: function () { return setConfirmingParticipant(null); },
                });
            }} disabled={confirmMutation.isPending}>
                {confirmMutation.isPending ? "Confirmando..." : "Confirmar"}
              </button_1.Button>
            </div>
          </div>
        </div>) : null}

      {createModalOpen ? (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg space-y-4 rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Cadastrar participante (reserva)</h2>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-reservation">Número reservado</label_1.Label>
              <select id="create-reservation" className="h-10 w-full rounded-md border bg-background px-3" value={createReservationId == null ? "" : String(createReservationId)} onChange={function (event) {
                var value = event.target.value;
                setCreateReservationId(value ? Number(value) : null);
            }}>
                <option value="">Selecione um número</option>
                {reservedNumbers.map(function (item) { return (<option key={item.bibNumber} value={String(item.bibNumber)}>
                    #{item.bibNumber} {item.label ? "\u2014 ".concat(item.label) : ""}
                  </option>); })}
              </select>
              {reservedNumbers.length === 0 ? (<p className="text-sm text-muted-foreground">
                  Nenhuma reserva disponível. Crie uma faixa antes de cadastrar.
                </p>) : null}
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-name">Nome</label_1.Label>
              <input_1.Input id="create-name" value={createName} onChange={function (e) { return setCreateName(e.target.value); }} placeholder="Nome do participante"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-birth-date">Data de nascimento</label_1.Label>
              <input_1.Input id="create-birth-date" type="date" value={createBirthDate} onChange={function (e) { return setCreateBirthDate(e.target.value); }} min={minBirthDate} max={maxBirthDate}/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-cpf">CPF</label_1.Label>
              <input_1.Input id="create-cpf" value={createCpf} onChange={function (e) { return setCreateCpf(e.target.value); }} placeholder="CPF"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-ticket-type">Tipo de ingresso</label_1.Label>
              <input_1.Input id="create-ticket-type" value={createTicketType} onChange={function (e) { return setCreateTicketType(e.target.value); }} placeholder="Ex.: 5KM, 10KM, Kids..." list="create-ticket-type-options"/>
              <datalist id="create-ticket-type-options">
                {ticketTypeOptions.map(function (option) { return (<option key={option} value={option}>
                    {option}
                  </option>); })}
              </datalist>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-shirt-size">Tamanho da camisa</label_1.Label>
              <input_1.Input id="create-shirt-size" value={createShirtSize} onChange={function (e) { return setCreateShirtSize(e.target.value); }} placeholder="Ex.: P, M, G, GG"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-team">Equipe</label_1.Label>
              <input_1.Input id="create-team" value={createTeam} onChange={function (e) { return setCreateTeam(e.target.value); }} placeholder="Nome da equipe"/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="create-sex">Sexo (opcional)</label_1.Label>
              <input_1.Input id="create-sex" value={createSex} onChange={function (e) { return setCreateSex(e.target.value); }} placeholder="Ex.: Feminino, Masculino"/>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button_1.Button variant="ghost" onClick={function () { return setCreateModalOpen(false); }} disabled={createParticipantMutation.isPending}>
                Cancelar
              </button_1.Button>
              <button_1.Button onClick={function () { return createParticipantMutation.mutate(); }} disabled={createParticipantMutation.isPending || reservedNumbers.length === 0}>
                {createParticipantMutation.isPending ? "Salvando..." : "Cadastrar"}
              </button_1.Button>
            </div>
          </div>
        </div>) : null}
    </main>);
}
function mapLegacyToEventParticipant(legacy) {
    var _a, _b, _c, _d, _e, _f, _g;
    var customFormResponses = [
        { name: "sexo", label: "Sexo", type: "text", response: (_a = legacy.sex) !== null && _a !== void 0 ? _a : "-" },
        { name: "camisa", label: "Tamanho da Camisa", type: "text", response: (_b = legacy.shirtSize) !== null && _b !== void 0 ? _b : "-" },
        { name: "equipe", label: "Equipe", type: "text", response: (_c = legacy.team) !== null && _c !== void 0 ? _c : "-" },
    ];
    return {
        id: legacy.id,
        name: legacy.name,
        cpf: legacy.cpf,
        birthDate: legacy.birthDate,
        sex: (_d = legacy.sex) !== null && _d !== void 0 ? _d : null,
        shirtSize: (_e = legacy.shirtSize) !== null && _e !== void 0 ? _e : null,
        team: (_f = legacy.team) !== null && _f !== void 0 ? _f : null,
        ticketId: legacy.id,
        sourceTicketId: undefined,
        ticketName: (_g = legacy.modality) !== null && _g !== void 0 ? _g : "Legado CSV",
        qrCode: legacy.id,
        checkinDone: legacy.checkinDone,
        bibNumber: legacy.bibNumber,
        customFormResponses: customFormResponses,
    };
}
