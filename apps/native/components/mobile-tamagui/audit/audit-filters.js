"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditFilters = AuditFilters;
var react_native_1 = require("react-native");
var tamagui_1 = require("tamagui");
var OPTIONS = ["ALL", "CONFIRMED", "DUPLICATE", "FAILED", "REVERSED"];
var STATUS_LABEL = {
    ALL: "Todos",
    CONFIRMED: "Confirmado",
    DUPLICATE: "Duplicado",
    FAILED: "Falho",
    REVERSED: "Desfeito",
};
function AuditFilters(_a) {
    var value = _a.value, onChange = _a.onChange;
    return (<tamagui_1.XStack flexDirection="row" flexWrap="wrap" gap="$2">
      {OPTIONS.map(function (option) {
            var isActive = value === option;
            return (<react_native_1.Pressable key={option} testID={"audit-filters-".concat(option.toLowerCase())} onPress={function () { return onChange(option); }} style={function (_a) {
                    var pressed = _a.pressed;
                    return ({
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: isActive ? "#2563eb" : "rgba(156,163,175,0.2)",
                        opacity: pressed ? 0.9 : 1,
                    });
                }}>
            <tamagui_1.Text fontSize={12} fontWeight="500" color={isActive ? "white" : "$foreground"}>
              {STATUS_LABEL[option]}
            </tamagui_1.Text>
          </react_native_1.Pressable>);
        })}
    </tamagui_1.XStack>);
}
