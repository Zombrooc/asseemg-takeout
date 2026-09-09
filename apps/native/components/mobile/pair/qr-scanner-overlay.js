"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrScannerOverlay = QrScannerOverlay;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
var responsive_1 = require("@/utils/responsive");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
function QrScannerOverlay(_a) {
    var description = _a.description, onCancel = _a.onCancel;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    var scale = (0, responsive_1.useResponsiveScale)().scale;
    return (<primitives_1.View className="absolute bottom-0 left-0 right-0 bg-black/70" style={{ padding: scale(16), paddingBottom: scale(16) + insets.bottom }}>
      <primitives_1.Text className="text-white text-center text-sm mb-2">{description}</primitives_1.Text>
      <ui_1.Button variant="bordered" className="px-4 py-3" onPress={onCancel}>Cancelar</ui_1.Button>
    </primitives_1.View>);
}
