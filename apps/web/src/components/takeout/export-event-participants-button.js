"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportEventParticipantsButton = ExportEventParticipantsButton;
var react_query_1 = require("@tanstack/react-query");
var lucide_react_1 = require("lucide-react");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var event_participants_export_1 = require("@/lib/event-participants-export");
var sonner_1 = require("sonner");
function ExportEventParticipantsButton(_a) {
    var eventId = _a.eventId, eventName = _a.eventName, participants = _a.participants, sourceType = _a.sourceType, _b = _a.disabled, disabled = _b === void 0 ? false : _b;
    var exportMutation = (0, react_query_1.useMutation)({
        mutationFn: function (format) {
            return (0, event_participants_export_1.exportEventParticipantsFile)({
                eventId: eventId,
                eventName: eventName,
                participants: participants,
                sourceType: sourceType,
                format: format,
            });
        },
        onSuccess: function (result, format) {
            if (result.status === "cancelled")
                return;
            if (result.status === "saved") {
                sonner_1.toast.success("Arquivo ".concat(format.toUpperCase(), " salvo (").concat(result.count, " participante(s))."));
                return;
            }
            sonner_1.toast.success("Download ".concat(format.toUpperCase(), " iniciado (").concat(result.count, " participante(s))."));
        },
        onError: function (error) {
            return sonner_1.toast.error(error instanceof Error ? error.message : "Erro ao exportar participantes.");
        },
    });
    var handleExport = function (format) {
        if (participants.length === 0) {
            sonner_1.toast.error("Nenhum participante para exportar.");
            return;
        }
        exportMutation.mutate(format);
    };
    return (<dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger render={<button_1.Button variant="outline" size="sm" disabled={disabled || exportMutation.isPending}/>} aria-label="Exportar">
        <lucide_react_1.Download className="size-4" aria-hidden/>
        {exportMutation.isPending ? "Exportando..." : "Exportar"}
        <lucide_react_1.ChevronDown className="size-4" aria-hidden/>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent align="end">
        <dropdown_menu_1.DropdownMenuItem onClick={function () { return handleExport("csv"); }}>Exportar CSV</dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem onClick={function () { return handleExport("json"); }}>Exportar JSON</dropdown_menu_1.DropdownMenuItem>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>);
}
