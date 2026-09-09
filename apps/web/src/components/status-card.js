"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCard = StatusCard;
var card_1 = require("@/components/ui/card");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var statusConfig = {
    connected: {
        bgColor: "bg-green-50 dark:bg-green-950/30",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-700 dark:text-green-400",
        indicatorColor: "#10b981",
        label: "Conectado",
    },
    disconnected: {
        bgColor: "bg-red-50 dark:bg-red-950/30",
        borderColor: "border-red-200 dark:border-red-800",
        textColor: "text-red-700 dark:text-red-400",
        indicatorColor: "#ef4444",
        label: "Desconectado",
    },
    pending: {
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        textColor: "text-yellow-700 dark:text-yellow-400",
        indicatorColor: "#f59e0b",
        label: "Verificando",
    },
};
function StatusCard(_a) {
    var title = _a.title, status = _a.status, value = _a.value, icon = _a.icon, description = _a.description;
    var config = statusConfig[status];
    return (<card_1.Card className={(0, utils_1.cn)("border", config.borderColor, config.bgColor)}>
      <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          {icon !== null && icon !== void 0 ? icon : (<lucide_react_1.Circle className="size-5 shrink-0" style={{ color: config.indicatorColor }} aria-hidden/>)}
          <card_1.CardTitle className="text-base font-semibold">{title}</card_1.CardTitle>
        </div>
        <span className={(0, utils_1.cn)("rounded-full px-2 py-0.5 text-xs font-medium", config.bgColor, config.textColor, config.borderColor, "border")}>
          {config.label}
        </span>
      </card_1.CardHeader>
      <card_1.CardContent>
        <p className={(0, utils_1.cn)("text-lg font-medium", config.textColor)}>{value}</p>
        {description != null && (<p className="mt-1 text-sm text-muted-foreground">{description}</p>)}
      </card_1.CardContent>
    </card_1.Card>);
}
