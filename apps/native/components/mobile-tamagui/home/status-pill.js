"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPill = StatusPill;
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function StatusPill(_a) {
    var isReachable = _a.isReachable;
    return (<react_native_1.View style={{ flexShrink: 0 }}>
      <ui_tamagui_1.Badge variant={isReachable ? "success" : "danger"}>
        {isReachable ? "LIVE" : "OFFLINE"}
      </ui_tamagui_1.Badge>
    </react_native_1.View>);
}
