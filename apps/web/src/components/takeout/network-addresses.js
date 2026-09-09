"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkAddresses = NetworkAddresses;
var react_query_1 = require("@tanstack/react-query");
var card_1 = require("@/components/ui/card");
var takeout_api_1 = require("@/lib/takeout-api");
function NetworkAddresses() {
    var _a, _b;
    var fallbackBaseUrl = (0, takeout_api_1.getTakeoutBaseUrl)();
    var _c = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "network-addresses"],
        queryFn: takeout_api_1.getNetworkAddresses,
        refetchInterval: 30000,
    }), data = _c.data, isLoading = _c.isLoading;
    var addresses = (_a = data === null || data === void 0 ? void 0 : data.addresses) !== null && _a !== void 0 ? _a : [];
    var fallbackAddress = (_b = data === null || data === void 0 ? void 0 : data.baseUrl) !== null && _b !== void 0 ? _b : fallbackBaseUrl;
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Enderecos de rede</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Conecte o app mobile na mesma rede usando um dos enderecos:
        </p>
        {isLoading ? (<p className="text-sm text-muted-foreground">Carregando...</p>) : addresses.length > 0 ? (<ul className="list-inside list-disc text-sm font-mono">
            {addresses.map(function (address) { return (<li key={address.url}>
                {address.url}
                {address.isPrimary ? " (principal)" : ""}
                <span className="text-muted-foreground"> - {address.interfaceName}</span>
              </li>); })}
          </ul>) : (<p className="text-sm font-mono">{fallbackAddress}</p>)}
      </card_1.CardContent>
    </card_1.Card>);
}
