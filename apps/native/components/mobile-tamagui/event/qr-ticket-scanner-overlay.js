"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrTicketScannerOverlay = QrTicketScannerOverlay;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
function QrTicketScannerOverlay(_a) {
    var onBack = _a.onBack;
    var insets = (0, react_native_safe_area_context_1.useSafeAreaInsets)();
    return (<>
      <react_native_1.View style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.7)",
            paddingTop: insets.top,
            paddingBottom: 12,
            paddingHorizontal: 8,
        }}>
        <react_native_1.Pressable onPress={onBack} style={{ minHeight: 44, minWidth: 44, justifyContent: "center", paddingRight: 8 }}>
          <Ionicons_1.default name="arrow-back" size={24} color="white"/>
        </react_native_1.Pressable>
        <react_native_1.Text style={{ flex: 1, textAlign: "center", color: "white", fontWeight: "500" }} numberOfLines={1}>
          Escanear ingresso
        </react_native_1.Text>
        <react_native_1.View style={{ minWidth: 44 }}/>
      </react_native_1.View>

      <react_native_1.View style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: 16,
            paddingBottom: 16 + insets.bottom,
        }}>
        <react_native_1.Text style={{ color: "white", textAlign: "center", fontSize: 14, marginBottom: 8 }}>
          Aponte para o QR code do ingresso
        </react_native_1.Text>
      </react_native_1.View>
    </>);
}
