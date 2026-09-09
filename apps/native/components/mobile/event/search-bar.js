"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchBar = SearchBar;
var Ionicons_1 = require("@expo/vector-icons/Ionicons");
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function SearchBar(_a) {
    var value = _a.value, onChange = _a.onChange, _b = _a.placeholder, placeholder = _b === void 0 ? "Buscar por nome, CPF ou ingresso..." : _b;
    return (<primitives_1.View className="relative mb-2 w-full">
      <primitives_1.View className="absolute left-3 top-0 bottom-0 justify-center z-10 pointer-events-none">
        <Ionicons_1.default name="search" size={20} color="#64748b"/>
      </primitives_1.View>
      <ui_1.Input placeholder={placeholder} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} className="pl-9 pr-9 rounded-xl min-h-[44px] border border-border bg-card w-full text-base text-foreground"/>
      {value.length > 0 ? (<primitives_1.Pressable onPress={function () { return onChange(""); }} className="absolute right-3 top-0 bottom-0 justify-center z-10 p-1 active:opacity-70" accessibilityLabel="Limpar busca">
          <Ionicons_1.default name="close-circle" size={20} color="#64748b"/>
        </primitives_1.Pressable>) : null}
    </primitives_1.View>);
}
