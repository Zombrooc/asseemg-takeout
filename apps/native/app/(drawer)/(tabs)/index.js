"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Home;
var heroui_native_1 = require("heroui-native");
var container_1 = require("@/components/container");
var primitives_1 = require("@/lib/primitives");
function Home() {
    return (<container_1.Container className="p-6">
      <primitives_1.View className="flex-1 justify-center items-center">
        <heroui_native_1.Card variant="secondary" className="p-8 items-center">
          <heroui_native_1.Card.Title className="text-3xl mb-2">Tab One</heroui_native_1.Card.Title>
        </heroui_native_1.Card>
      </primitives_1.View>
    </container_1.Container>);
}
