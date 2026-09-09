"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrScannerOverlay = QrScannerOverlay;
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
var ui_tamagui_1 = require("@/components/ui-tamagui");
var tamagui_1 = require("tamagui");
function QrScannerOverlay(_a) {
    var description = _a.description, onCancel = _a.onCancel;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    return (<tamagui_1.YStack position="absolute" bottom={0} left={0} right={0} backgroundColor="rgba(0,0,0,0.7)" padding="$4" paddingBottom={16 + insets.bottom}>
      <tamagui_1.Text color="white" textAlign="center" fontSize={14} marginBottom="$2">
        {description}
      </tamagui_1.Text>
      <ui_tamagui_1.Button variant="bordered" onPress={onCancel}>
        Cancelar
      </ui_tamagui_1.Button>
    </tamagui_1.YStack>);
}
