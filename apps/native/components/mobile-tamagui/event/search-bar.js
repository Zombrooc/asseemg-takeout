"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchBar = SearchBar;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var react_native_1 = require("react-native");
var ui_tamagui_1 = require("@/components/ui-tamagui");
function SearchBar(_a) {
    var value = _a.value, onChange = _a.onChange, _b = _a.placeholder, placeholder = _b === void 0 ? "Buscar por nome, CPF ou ingresso..." : _b;
    return (<react_native_1.View style={{ position: "relative", marginBottom: 8, width: "100%" }}>
      <react_native_1.View style={{
            position: "absolute",
            left: 12,
            top: 0,
            bottom: 0,
            justifyContent: "center",
            zIndex: 10,
            pointerEvents: "none",
        }}>
        <Ionicons_1.default name="search" size={20} color="#64748b"/>
      </react_native_1.View>
      <ui_tamagui_1.Input placeholder={placeholder} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} style={{ paddingLeft: 36, paddingRight: 36, minHeight: 44 }}/>
      {value.length > 0 ? (<react_native_1.Pressable onPress={function () { return onChange(""); }} style={{
                position: "absolute",
                right: 12,
                top: 0,
                bottom: 0,
                justifyContent: "center",
                zIndex: 10,
                padding: 4,
            }} accessibilityLabel="Limpar busca">
          <Ionicons_1.default name="close-circle" size={20} color="#64748b"/>
        </react_native_1.Pressable>) : null}
    </react_native_1.View>);
}
