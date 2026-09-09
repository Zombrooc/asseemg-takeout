"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingTipsCard = PairingTipsCard;
var react_1 = require("react");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var TIPS = [
    "Abra o app Takeout Desktop no computador",
    "Aguarde o servidor iniciar (indicador verde na tela inicial)",
    "O QR Code e URL ficam visíveis na seção de pareamento",
    "O token é renovado a cada sessão por segurança",
    "Dispositivo e desktop devem estar na mesma rede Wi-Fi",
];
function PairingTipsCard() {
    var _a = (0, react_1.useState)(false), expanded = _a[0], setExpanded = _a[1];
    return (<primitives_1.Pressable onPress={function () { return setExpanded(!expanded); }} className="mb-4 min-h-[48px] active:opacity-90">
      <ui_1.Card className="rounded-2xl border border-border p-0 overflow-hidden bg-card">
        <primitives_1.View className="flex-row items-center gap-3 px-4 py-3.5">
          <primitives_1.Text className="text-foreground font-medium text-sm flex-1 leading-snug">
            Como encontrar o QR Code
          </primitives_1.Text>
          <primitives_1.View className="shrink-0">
            <Ionicons_1.default name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b"/>
          </primitives_1.View>
        </primitives_1.View>
        {expanded ? (<primitives_1.View className="px-4 pb-4 pt-0 border-t border-border">
            {TIPS.map(function (tip, i) { return (<primitives_1.View key={i} className="flex-row gap-2 mt-2">
                <primitives_1.Text className="text-muted-foreground text-sm font-medium w-5 shrink-0 leading-snug">
                  {i + 1}.
                </primitives_1.Text>
                <primitives_1.Text className="text-muted-foreground text-sm flex-1 leading-relaxed">
                  {tip}
                </primitives_1.Text>
              </primitives_1.View>); })}
          </primitives_1.View>) : null}
      </ui_1.Card>
    </primitives_1.Pressable>);
}
