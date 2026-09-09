"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingMethodTabs = PairingMethodTabs;
var react_native_1 = require("react-native");
var TABS = [
    { value: "qr", label: "QR Code" },
    { value: "manual", label: "Manual" },
];
function PairingMethodTabs(_a) {
    var method = _a.method, onChange = _a.onChange;
    return (<react_native_1.View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
      {TABS.map(function (tab) {
            var isActive = method === tab.value;
            return (<react_native_1.Pressable key={tab.value} onPress={function () { return onChange(tab.value); }} style={function (_a) {
                    var pressed = _a.pressed;
                    return [
                        {
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 10,
                            minHeight: 44,
                            borderRadius: 12,
                            backgroundColor: isActive ? undefined : "rgba(156,163,175,0.1)",
                            borderWidth: 1,
                            borderColor: isActive ? undefined : "transparent",
                            opacity: pressed ? 0.9 : 1,
                        },
                        isActive && {
                            backgroundColor: "#f9fafb",
                            borderColor: "#e5e7eb",
                        },
                    ];
                }}>
            <react_native_1.Text style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: isActive ? "#6366f1" : "#6b7280",
                }}>
              {tab.label}
            </react_native_1.Text>
          </react_native_1.Pressable>);
        })}
    </react_native_1.View>);
}
