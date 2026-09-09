"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventCard = EventCard;
var react_router_1 = require("@tanstack/react-router");
var card_1 = require("@/components/ui/card");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var button_2 = require("@/components/ui/button");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function EventCard(_a) {
    var eventId = _a.eventId, name = _a.name, date = _a.date, participantCount = _a.participantCount, icon = _a.icon, _b = _a.archived, archived = _b === void 0 ? false : _b, onArchive = _a.onArchive, onUnarchive = _a.onUnarchive, onDelete = _a.onDelete;
    return (<card_1.Card className={(0, utils_1.cn)(archived && "opacity-60")}>
      <card_1.CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {icon != null ? (<span className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg">
              {icon}
            </span>) : (<lucide_react_1.Users className="size-10 shrink-0 text-muted-foreground" aria-hidden/>)}
          <div>
            <card_1.CardTitle className="text-base font-semibold">{name}</card_1.CardTitle>
            {archived && (<span className="text-xs text-muted-foreground">Arquivado</span>)}
          </div>
        </div>
        {(onArchive != null || onUnarchive != null || onDelete != null) && (<dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger>
              <button_1.Button variant="ghost" size="icon" aria-label="Ações do evento">
                <lucide_react_1.MoreVertical className="size-4"/>
              </button_1.Button>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="end">
              {!archived && onArchive != null && (<dropdown_menu_1.DropdownMenuItem onClick={onArchive}>Arquivar</dropdown_menu_1.DropdownMenuItem>)}
              {archived && onUnarchive != null && (<dropdown_menu_1.DropdownMenuItem onClick={onUnarchive}>Restaurar</dropdown_menu_1.DropdownMenuItem>)}
              {onDelete != null && (<dropdown_menu_1.DropdownMenuItem variant="destructive" onClick={onDelete}>
                  Apagar
                </dropdown_menu_1.DropdownMenuItem>)}
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>)}
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{date}</p>
        <p className="text-sm text-muted-foreground">
          {participantCount} participante{participantCount !== 1 ? "s" : ""}
        </p>
        {!archived ? (<react_router_1.Link to="/events/$eventId" params={{ eventId: eventId }} className={(0, utils_1.cn)((0, button_2.buttonVariants)({ variant: "default", size: "sm" }), "w-full")}>
            Ver Participantes
          </react_router_1.Link>) : (onUnarchive != null && (<button_1.Button variant="outline" size="sm" className="w-full" onClick={onUnarchive}>
              Restaurar
            </button_1.Button>))}
      </card_1.CardContent>
    </card_1.Card>);
}
