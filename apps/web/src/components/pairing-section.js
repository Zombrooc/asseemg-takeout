"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingSection = PairingSection;
var card_1 = require("@/components/ui/card");
var button_1 = require("@/components/ui/button");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var qrcode_react_1 = require("qrcode.react");
var react_1 = require("react");
var sonner_1 = require("sonner");
var QR_SIZE = 200;
function PairingSection(_a) {
    var pairingUrl = _a.pairingUrl, expiresAt = _a.expiresAt, onRenewToken = _a.onRenewToken, _b = _a.isRenewing, isRenewing = _b === void 0 ? false : _b;
    var _c = (0, react_1.useState)(false), copied = _c[0], setCopied = _c[1];
    var expiresAtEpoch = Number(expiresAt !== null && expiresAt !== void 0 ? expiresAt : "0");
    var nowEpoch = Math.floor(Date.now() / 1000);
    var isTokenExpired = expiresAtEpoch > 0 && expiresAtEpoch <= nowEpoch;
    var expiresInMin = expiresAtEpoch > 0 ? Math.max(0, Math.ceil((expiresAtEpoch - nowEpoch) / 60)) : null;
    var handleCopyUrl = function () {
        navigator.clipboard.writeText(pairingUrl);
        setCopied(true);
        sonner_1.toast.success("URL copiada para a area de transferencia");
        setTimeout(function () { return setCopied(false); }, 2000);
    };
    return (<card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle className="text-lg">Conectar App Mobile na LAN</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 justify-center rounded-lg border bg-white p-2 dark:bg-muted">
          <qrcode_react_1.QRCodeSVG value={pairingUrl} size={QR_SIZE} level="M" aria-label="QR Code para pareamento"/>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Escaneie com o app mobile ou acesse a URL manualmente. O mesmo QR funciona em multiplos aparelhos ate a expiracao do token.
          </p>
          <p className={(0, utils_1.cn)("text-xs", isTokenExpired ? "text-amber-600" : "text-muted-foreground")}>
            {isTokenExpired
            ? "Token expirado. O desktop vai gerar um novo automaticamente."
            : expiresInMin != null
                ? "Token valido por cerca de ".concat(expiresInMin, " min")
                : "Validade do token indisponivel"}
          </p>
          <code className="block max-w-full truncate rounded-md border bg-muted px-3 py-2 text-xs">
            {pairingUrl}
          </code>
          <div className="flex flex-wrap gap-2">
            <button_1.Button variant="outline" size="sm" onClick={handleCopyUrl} aria-label="Copiar URL">
              <lucide_react_1.Copy className="size-4 shrink-0" aria-hidden/>
              {copied ? "Copiado" : "Copiar URL"}
            </button_1.Button>
            {onRenewToken != null && (<button_1.Button variant="secondary" size="sm" onClick={onRenewToken} disabled={isRenewing} aria-label="Renovar token">
                <lucide_react_1.RotateCw className={(0, utils_1.cn)("size-4 shrink-0", isRenewing && "animate-spin")} aria-hidden/>
                {isRenewing ? "Renovando..." : "Renovar Token"}
              </button_1.Button>)}
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
