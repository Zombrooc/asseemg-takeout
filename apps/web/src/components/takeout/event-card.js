"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCard = EventCard;
var react_router_1 = require("@tanstack/react-router");
var lucide_react_1 = require("lucide-react");
var card_1 = require("@/components/ui/card");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var button_1 = require("@/components/ui/button");
var utils_1 = require("@/lib/utils");
var format_date_1 = require("@/lib/format-date");
function EventCard(_a) {
    var _b;
    var event = _a.event, onArchive = _a.onArchive, onUnarchive = _a.onUnarchive, onDelete = _a.onDelete;
    return (<card_1.Card>
      <card_1.CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <card_1.CardTitle className="text-base">{(_b = event.name) !== null && _b !== void 0 ? _b : event.eventId}</card_1.CardTitle>
        {(onArchive != null || onUnarchive != null || onDelete != null) && (<dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label="Ações do evento">
              <lucide_react_1.MoreVertical className="size-4"/>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="end">
              {onArchive != null && (<dropdown_menu_1.DropdownMenuItem onClick={function () { return onArchive(event); }}>
                  Arquivar
                </dropdown_menu_1.DropdownMenuItem>)}
              {onUnarchive != null && (<dropdown_menu_1.DropdownMenuItem onClick={function () { return onUnarchive(event); }}>
                  Desarquivar
                </dropdown_menu_1.DropdownMenuItem>)}
              {onDelete != null && (<dropdown_menu_1.DropdownMenuItem variant="destructive" onClick={function () { return onDelete(event); }}>
                  Apagar
                </dropdown_menu_1.DropdownMenuItem>)}
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>)}
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {event.startTime ? "".concat(event.startTime, " \u00B7 ") : ""}
          {(0, format_date_1.formatDateBR)(event.startDate)}
        </p>
        <react_router_1.Link to="/events/$eventId" params={{ eventId: event.eventId }} className={(0, utils_1.cn)((0, button_1.buttonVariants)({ variant: "outline", size: "sm" }))}>
          Ver participantes
        </react_router_1.Link>
      </card_1.CardContent>
    </card_1.Card>);
}
