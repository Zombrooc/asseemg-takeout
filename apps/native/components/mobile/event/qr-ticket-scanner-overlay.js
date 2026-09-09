"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrTicketScannerOverlay = QrTicketScannerOverlay;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
var responsive_1 = require("@/utils/responsive");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
function QrTicketScannerOverlay(_a) {
    var onBack = _a.onBack;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var scale = (0, responsive_1.useResponsiveScale)().scale;
    return (<>
      <primitives_1.View className="absolute top-0 left-0 right-0 flex-row items-center bg-black/70" style={{ paddingTop: insets.top, paddingBottom: scale(12), paddingHorizontal: scale(8) }}>
        <ui_1.IconButton onPress={onBack} className="justify-center pr-2" style={{ minHeight: scale(44), minWidth: scale(44) }}>
          <Ionicons_1.default name="arrow-back" size={24} color="white"/>
        </ui_1.IconButton>
        <primitives_1.Text className="flex-1 text-center text-white font-medium" numberOfLines={1}>
          Escanear ingresso
        </primitives_1.Text>
        <primitives_1.View style={{ minWidth: scale(44) }}/>
      </primitives_1.View>

      <primitives_1.View className="absolute bottom-0 left-0 right-0 bg-black/70" style={{ padding: scale(16), paddingBottom: scale(16) + insets.bottom }}>
        <primitives_1.Text className="text-white text-center text-sm mb-2">Aponte para o QR code do ingresso</primitives_1.Text>
      </primitives_1.View>
    </>);
}
