"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingMethodTabs = PairingMethodTabs;
var primitives_1 = require("@/lib/primitives");
var TABS = [
    { value: "qr", label: "QR Code" },
    { value: "manual", label: "Manual" },
];
function PairingMethodTabs(_a) {
    var method = _a.method, onChange = _a.onChange;
    return (<primitives_1.View className="flex-row gap-2 mb-4">
      {TABS.map(function (tab) {
            var isActive = method === tab.value;
            return (<primitives_1.Pressable key={tab.value} onPress={function () { return onChange(tab.value); }} className={"flex-1 items-center justify-center py-2.5 rounded-xl min-h-[44px] border ".concat(isActive
                    ? "bg-card border-border"
                    : "bg-muted/10 border-transparent")} style={isActive
                    ? {
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1,
                    }
                    : undefined}>
            <primitives_1.Text className={"text-sm font-semibold leading-tight ".concat(isActive ? "text-accent" : "text-muted-foreground")}>
              {tab.label}
            </primitives_1.Text>
          </primitives_1.Pressable>);
        })}
    </primitives_1.View>);
}
