"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopBar = TopBar;
var heroui_native_1 = require("heroui-native");
var primitives_1 = require("@/lib/primitives");
function TopBar(_a) {
    var title = _a.title, subtitle = _a.subtitle, rightSlot = _a.rightSlot, actionSlot = _a.actionSlot, className = _a.className, children = _a.children;
    return (<primitives_1.View className={(0, heroui_native_1.cn)("px-4 pt-2 pb-3 border-b border-border bg-background", className)}>
      <primitives_1.View className="flex-row items-center justify-between gap-3">
        <primitives_1.View className="flex-1 min-w-0 shrink">
          <primitives_1.Text className="text-lg font-semibold text-foreground leading-tight" numberOfLines={1}>
            {title}
          </primitives_1.Text>
          {subtitle ? (<primitives_1.Text className="text-muted-foreground text-sm mt-0.5 leading-snug" numberOfLines={1}>
              {subtitle}
            </primitives_1.Text>) : null}
        </primitives_1.View>
        <primitives_1.View className="flex-row items-center gap-2 shrink-0">
          {actionSlot}
          {rightSlot}
        </primitives_1.View>
      </primitives_1.View>
      {children}
    </primitives_1.View>);
}
