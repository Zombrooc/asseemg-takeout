"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStatusCard = ConnectionStatusCard;
var expo_router_1 = require("expo-router");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function ConnectionStatusCard(_a) {
    var isReachable = _a.isReachable, _b = _a.isConnecting, isConnecting = _b === void 0 ? false : _b, baseUrl = _a.baseUrl, onRetry = _a.onRetry, onDisconnect = _a.onDisconnect;
    var router = (0, expo_router_1.useRouter)();
    if (isConnecting) {
        return (<ui_1.Card className="mb-4 border border-border rounded-2xl p-4 bg-warning/10 overflow-hidden">
        <primitives_1.View className="flex-row items-center flex-wrap gap-2">
          <primitives_1.View className="w-2.5 h-2.5 rounded-full bg-warning shrink-0"/>
          <primitives_1.Text className="text-warning font-medium text-sm leading-snug">
            Conectando...
          </primitives_1.Text>
        </primitives_1.View>
        {baseUrl ? (<primitives_1.Text className="text-muted-foreground text-xs mt-2 leading-tight" numberOfLines={1} ellipsizeMode="middle">
            {baseUrl}
          </primitives_1.Text>) : null}
      </ui_1.Card>);
    }
    if (isReachable) {
        return (<ui_1.Card className="mb-4 border border-border rounded-2xl p-4 bg-card overflow-hidden">
        <primitives_1.View className="flex-row items-center flex-wrap gap-2">
          <primitives_1.View className="w-2.5 h-2.5 rounded-full bg-success shrink-0"/>
          <primitives_1.Text className="text-foreground font-medium text-sm leading-snug">
            Conectado ao desktop
          </primitives_1.Text>
        </primitives_1.View>
        {baseUrl ? (<primitives_1.Text className="text-muted-foreground text-xs mt-2 leading-tight" numberOfLines={1} ellipsizeMode="middle">
            {baseUrl}
          </primitives_1.Text>) : null}
        {onDisconnect ? (<ui_1.Button testID="home-unpair" size="sm" variant="bordered" className="mt-3 rounded-xl min-h-[40px] px-4 py-2" onPress={onDisconnect}>
            Desparear
          </ui_1.Button>) : null}
      </ui_1.Card>);
    }
    return (<ui_1.Card className="mb-4 border border-border rounded-2xl p-4 bg-card overflow-hidden">
      <primitives_1.Text className="text-foreground font-medium text-sm leading-snug mb-1">
        Sem conexão com o desktop
      </primitives_1.Text>
      <primitives_1.Text className="text-muted-foreground text-sm leading-relaxed mb-4">
        Conecte ao app Takeout Desktop na mesma rede local para iniciar.
      </primitives_1.Text>
      <primitives_1.View className="flex-row gap-2 flex-wrap">
        <ui_1.Button testID="connection-status-retry" size="sm" className="px-4 py-2 rounded-xl min-h-[40px]" onPress={onRetry}>
          Tentar novamente
        </ui_1.Button>
        <ui_1.Button testID="connection-status-reconnect" size="sm" variant="bordered" className="px-4 py-2 rounded-xl min-h-[40px]" onPress={function () { return router.push("/pair"); }}>
          Reconectar
        </ui_1.Button>
      </primitives_1.View>
    </ui_1.Card>);
}
