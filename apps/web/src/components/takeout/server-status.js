"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerStatus = ServerStatus;
var react_query_1 = require("@tanstack/react-query");
var card_1 = require("@/components/ui/card");
var takeout_api_1 = require("@/lib/takeout-api");
function ServerStatus() {
    var _a = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "health"],
        queryFn: takeout_api_1.getHealth,
        refetchInterval: 10000,
    }), data = _a.data, isLoading = _a.isLoading, isError = _a.isError;
    var ok = !isError && (data === null || data === void 0 ? void 0 : data.status) === "ok";
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Servidor</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="flex items-center gap-2">
        <div className={"h-2 w-2 rounded-full shrink-0 ".concat(ok ? "bg-green-500" : "bg-red-500")}/>
        <span className="text-sm text-muted-foreground">
          {isLoading ? "Verificando..." : ok ? "Conectado" : "Desconectado"}
        </span>
      </card_1.CardContent>
    </card_1.Card>);
}
