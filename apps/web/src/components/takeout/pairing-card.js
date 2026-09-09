"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingCard = PairingCard;
var react_query_1 = require("@tanstack/react-query");
var qrcode_react_1 = require("qrcode.react");
var react_1 = require("react");
var card_1 = require("@/components/ui/card");
var button_1 = require("@/components/ui/button");
var takeout_api_1 = require("@/lib/takeout-api");
var sonner_1 = require("sonner");
function pairingUrl(baseUrl, token) {
    var u = new URL(baseUrl);
    u.searchParams.set("token", token);
    return u.toString();
}
function PairingCard() {
    var qc = (0, react_query_1.useQueryClient)();
    var _a = (0, react_query_1.useQuery)({
        queryKey: ["takeout", "connectionInfo"],
        queryFn: takeout_api_1.getConnectionInfo,
    }), data = _a.data, isLoading = _a.isLoading;
    var renew = (0, react_query_1.useMutation)({
        mutationFn: takeout_api_1.renewPairingToken,
        onSuccess: function (info) {
            qc.setQueryData(["takeout", "connectionInfo"], info);
            sonner_1.toast.success("Token renovado");
        },
        onError: function () { return sonner_1.toast.error("Falha ao renovar token"); },
    });
    var _b = (0, react_1.useState)(false), copied = _b[0], setCopied = _b[1];
    var url = data ? pairingUrl(data.baseUrl, data.pairingToken) : "";
    var copyUrl = function () {
        if (!url)
            return;
        navigator.clipboard.writeText(url);
        setCopied(true);
        sonner_1.toast.success("URL copiada");
        setTimeout(function () { return setCopied(false); }, 2000);
    };
    if (isLoading || !data) {
        return (<card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Conectar app mobile</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </card_1.CardContent>
      </card_1.Card>);
    }
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Conectar app mobile</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center rounded border bg-white p-2">
          <qrcode_react_1.QRCodeSVG value={url} size={160} level="M"/>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Escaneie o QR no app mobile ou use a URL abaixo.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="max-w-full truncate rounded bg-muted px-2 py-1 text-xs">
              {url}
            </code>
            <button_1.Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? "Copiado" : "Copiar"}
            </button_1.Button>
          </div>
          <button_1.Button variant="secondary" size="sm" onClick={function () { return renew.mutate(); }} disabled={renew.isPending}>
            {renew.isPending ? "Renovando..." : "Renovar token"}
          </button_1.Button>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
