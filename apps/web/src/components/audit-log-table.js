"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogTable = AuditLogTable;
var button_1 = require("@/components/ui/button");
var table_1 = require("@/components/ui/table");
var status_badge_1 = require("@/components/status-badge");
var format_date_1 = require("@/lib/format-date");
var audit_utils_1 = require("@/lib/audit-utils");
var lucide_react_1 = require("lucide-react");
function auditStatusToBadge(status) {
    switch (status) {
        case "CONFIRMED":
            return "confirmed";
        case "DUPLICATE":
            return "duplicate";
        case "FAILED":
            return "failed";
        case "REVERSED":
            return "reversed";
    }
}
function AuditLogTable(_a) {
    var logs = _a.logs, _b = _a.isLoading, isLoading = _b === void 0 ? false : _b, onRetry = _a.onRetry, onExport = _a.onExport;
    return (<div className="space-y-4">
      {onExport != null && (<div className="flex justify-end">
          <button_1.Button variant="outline" size="sm" onClick={onExport} aria-label="Exportar CSV">
            <lucide_react_1.Download className="size-4" aria-hidden/>
            Exportar CSV
          </button_1.Button>
        </div>)}
      <div className="rounded-md border">
        <table_1.Table role="table">
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead scope="col">Check-in</table_1.TableHead>
              <table_1.TableHead scope="col">Participante</table_1.TableHead>
              <table_1.TableHead scope="col">Ingresso</table_1.TableHead>
              <table_1.TableHead scope="col">Nascimento</table_1.TableHead>
              <table_1.TableHead scope="col">Idade</table_1.TableHead>
              <table_1.TableHead scope="col">Operador</table_1.TableHead>
              <table_1.TableHead scope="col">Tipo de retirada</table_1.TableHead>
              <table_1.TableHead scope="col">Retirante</table_1.TableHead>
              <table_1.TableHead scope="col">Status</table_1.TableHead>
              {onRetry != null && (<table_1.TableHead scope="col" className="w-[100px]"/>)}
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {isLoading ? (<table_1.TableRow>
                <table_1.TableCell colSpan={onRetry != null ? 10 : 9} className="text-center text-muted-foreground">
                  Carregando...
                </table_1.TableCell>
              </table_1.TableRow>) : logs.length === 0 ? (<table_1.TableRow>
                <table_1.TableCell colSpan={onRetry != null ? 10 : 9} className="text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </table_1.TableCell>
              </table_1.TableRow>) : (logs.map(function (log) {
            var _a, _b, _c, _d, _e, _f, _g;
            var retirada = (0, audit_utils_1.parseAuditRetirantePayload)(log.payload_json);
            return (<table_1.TableRow key={log.request_id}>
                    <table_1.TableCell className="whitespace-nowrap text-sm">
                      {(0, format_date_1.formatDateTimeBR)(log.checked_in_at)}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-sm">{(_a = log.participant_name) !== null && _a !== void 0 ? _a : "-"}</table_1.TableCell>
                    <table_1.TableCell className="text-xs">
                      <div className="font-mono">{log.ticket_id}</div>
                      <div className="text-muted-foreground">{(_b = log.ticket_name) !== null && _b !== void 0 ? _b : "-"}</div>
                      <div className="text-muted-foreground">{(_c = log.ticket_source_id) !== null && _c !== void 0 ? _c : "-"}</div>
                    </table_1.TableCell>
                    <table_1.TableCell className="text-sm">{(_d = log.birth_date) !== null && _d !== void 0 ? _d : "-"}</table_1.TableCell>
                    <table_1.TableCell className="text-sm">{(_e = log.age_at_checkin) !== null && _e !== void 0 ? _e : "-"}</table_1.TableCell>
                    <table_1.TableCell className="text-sm">{(_f = log.operator_alias) !== null && _f !== void 0 ? _f : log.operator_device_id}</table_1.TableCell>
                    <table_1.TableCell className="text-sm">
                      {retirada.retiradaPorTerceiro ? "Terceiro" : "Titular"}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-sm">
                      {(_g = retirada.retiranteNome) !== null && _g !== void 0 ? _g : "-"}
                    </table_1.TableCell>
                    <table_1.TableCell>
                      <status_badge_1.StatusBadge status={auditStatusToBadge(log.status)}/>
                    </table_1.TableCell>
                    {onRetry != null && (<table_1.TableCell>
                        {log.status === "FAILED" && (<button_1.Button variant="ghost" size="sm" onClick={function () { return onRetry(log); }} aria-label="Tentar novamente">
                            <lucide_react_1.RotateCw className="size-4" aria-hidden/>
                            Retry
                          </button_1.Button>)}
                      </table_1.TableCell>)}
                  </table_1.TableRow>);
        }))}
          </table_1.TableBody>
        </table_1.Table>
      </div>
    </div>);
}
