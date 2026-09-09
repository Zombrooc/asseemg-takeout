"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCpf = formatCpf;
exports.resolveDisplayTicket = resolveDisplayTicket;
exports.ParticipantsTable = ParticipantsTable;
var button_1 = require("@/components/ui/button");
var table_1 = require("@/components/ui/table");
var status_badge_1 = require("@/components/status-badge");
var utils_1 = require("@/lib/utils");
var qrcode_react_1 = require("qrcode.react");
var format_date_1 = require("@/lib/format-date");
var lucide_react_1 = require("lucide-react");
var QR_SIZE = 160;
function formatCpf(cpf) {
    if (cpf == null || cpf === "")
        return "-";
    var digits = cpf.replace(/\D/g, "").slice(0, 11);
    if (digits.length < 11)
        return cpf;
    return "".concat(digits.slice(0, 3), ".").concat(digits.slice(3, 6), ".").concat(digits.slice(6, 9), "-").concat(digits.slice(9));
}
function resolveDisplayTicket(participant) {
    var _a, _b;
    var ticketName = (_a = participant.ticketName) === null || _a === void 0 ? void 0 : _a.trim();
    var sourceTicketId = (_b = participant.sourceTicketId) === null || _b === void 0 ? void 0 : _b.trim();
    if (ticketName) {
        if (sourceTicketId && !sourceTicketId.startsWith("#")) {
            return "".concat(sourceTicketId, " - ").concat(ticketName);
        }
        return ticketName;
    }
    return sourceTicketId || participant.ticketId || "-";
}
function ParticipantsTable(_a) {
    var eventName = _a.eventName, participants = _a.participants, _b = _a.participantAlerts, participantAlerts = _b === void 0 ? {} : _b, onConfirm = _a.onConfirm, onUndo = _a.onUndo, onEdit = _a.onEdit, _c = _a.isConfirming, isConfirming = _c === void 0 ? false : _c, _d = _a.isUndoing, isUndoing = _d === void 0 ? false : _d, _e = _a.isEditing, isEditing = _e === void 0 ? false : _e, _f = _a.showQrColumn, showQrColumn = _f === void 0 ? false : _f;
    var confirmedCount = participants.filter(function (p) { return p.checkinDone; }).length;
    var pendingCount = participants.length - confirmedCount;
    return (<div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{eventName}</h2>
        <p className="text-sm text-muted-foreground">
          {confirmedCount} confirmados · {pendingCount} pendentes
        </p>
      </div>
      <div className="rounded-md border">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead scope="col" className="w-12">
                Alerta
              </table_1.TableHead>
              <table_1.TableHead scope="col">Nome</table_1.TableHead>
              <table_1.TableHead scope="col">CPF</table_1.TableHead>
              <table_1.TableHead scope="col">Dt. Nasc.</table_1.TableHead>
              <table_1.TableHead scope="col">Peito</table_1.TableHead>
              <table_1.TableHead scope="col">Ingresso</table_1.TableHead>
              {showQrColumn && <table_1.TableHead scope="col">QR Code</table_1.TableHead>}
              <table_1.TableHead scope="col">Status</table_1.TableHead>
              <table_1.TableHead scope="col" className="w-[155px]">
                Acao
              </table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {participants.length === 0 ? (<table_1.TableRow>
                <table_1.TableCell colSpan={showQrColumn ? 9 : 8} className="py-8 text-center text-muted-foreground">
                  Nenhum participante encontrado.
                </table_1.TableCell>
              </table_1.TableRow>) : (participants.map(function (p) {
            var _a, _b;
            var alerts = (_a = participantAlerts[p.id]) !== null && _a !== void 0 ? _a : [];
            var alertMessage = alerts.map(function (item) { return item.message; }).join("\n");
            return (<table_1.TableRow key={p.id} className={(0, utils_1.cn)(p.checkinDone && "bg-green-50/50 dark:bg-green-950/20")}>
                    <table_1.TableCell>
                      {alerts.length > 0 ? (<span className="inline-flex items-center text-red-600" title={alertMessage} aria-label={alertMessage}>
                          <lucide_react_1.TriangleAlert className="size-4" aria-hidden/>
                        </span>) : null}
                    </table_1.TableCell>
                    <table_1.TableCell className="whitespace-normal">{(_b = p.name) !== null && _b !== void 0 ? _b : "-"}</table_1.TableCell>
                    <table_1.TableCell className="font-mono text-xs">{formatCpf(p.cpf)}</table_1.TableCell>
                    <table_1.TableCell className="font-mono text-xs">{(0, format_date_1.formatBirthDateBR)(p.birthDate)}</table_1.TableCell>
                    <table_1.TableCell className="font-mono tabular-nums">
                      {p.bibNumber != null ? p.bibNumber : "-"}
                    </table_1.TableCell>
                    <table_1.TableCell className="whitespace-normal">{resolveDisplayTicket(p)}</table_1.TableCell>
                    {showQrColumn && (<table_1.TableCell>
                        {p.qrCode ? (<qrcode_react_1.QRCodeSVG value={p.qrCode} size={QR_SIZE} level="M" aria-label="QR do ingresso"/>) : ("-")}
                      </table_1.TableCell>)}
                    <table_1.TableCell>
                      <status_badge_1.StatusBadge status={p.checkinDone ? "confirmed" : "pending"}/>
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <div className="flex items-center gap-2">
                        {!p.checkinDone && onEdit != null && (<button_1.Button variant="outline" size="sm" disabled={isEditing} onClick={function () { return onEdit(p); }}>
                            {isEditing ? "..." : "Editar"}
                          </button_1.Button>)}
                        {!p.checkinDone && onConfirm != null && (<button_1.Button variant="outline" size="sm" disabled={isConfirming} onClick={function () { return onConfirm(p); }}>
                            {isConfirming ? "..." : "Confirmar"}
                          </button_1.Button>)}
                        {p.checkinDone && onUndo != null && (<button_1.Button variant="outline" size="sm" disabled={isUndoing} onClick={function () { return onUndo(p); }}>
                            {isUndoing ? "..." : "Desfazer"}
                          </button_1.Button>)}
                      </div>
                    </table_1.TableCell>
                  </table_1.TableRow>);
        }))}
          </table_1.TableBody>
        </table_1.Table>
      </div>
    </div>);
}
