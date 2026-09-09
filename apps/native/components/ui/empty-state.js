"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
var button_1 = require("@/components/ui/button");
var primitives_1 = require("@/lib/primitives");
function EmptyState(_a) {
    var icon = _a.icon, title = _a.title, description = _a.description, cta = _a.cta;
    return (<primitives_1.View className="py-10 px-4 items-center justify-center min-h-[200px]">
      {icon ? (<primitives_1.View className="mb-4 w-12 h-12 items-center justify-center rounded-full bg-muted/20">
          {icon}
        </primitives_1.View>) : null}
      <primitives_1.Text className="text-foreground font-semibold text-center text-base leading-tight">
        {title}
      </primitives_1.Text>
      {description ? (<primitives_1.Text className="text-muted-foreground text-sm text-center mt-2 max-w-[280px] leading-relaxed">
          {description}
        </primitives_1.Text>) : null}
      {cta ? (<button_1.Button className="mt-6 px-4 py-3 rounded-xl min-h-[44px]" onPress={cta.onPress}>
          {cta.label}
        </button_1.Button>) : null}
    </primitives_1.View>);
}
