"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopBar = TopBar;
var tamagui_1 = require("tamagui");
function TopBar(_a) {
    var title = _a.title, subtitle = _a.subtitle, rightSlot = _a.rightSlot, actionSlot = _a.actionSlot, children = _a.children;
    return (<tamagui_1.YStack paddingHorizontal="$4" paddingTop="$2" paddingBottom="$3" borderBottomWidth={1} borderColor="$border" backgroundColor="$background">
      <tamagui_1.XStack alignItems="center" justifyContent="space-between" gap="$3">
        <tamagui_1.YStack flex={1} minWidth={0} flexShrink={1}>
          <tamagui_1.Text fontSize={18} fontWeight="600" color="$foreground" numberOfLines={1}>
            {title}
          </tamagui_1.Text>
          {subtitle ? (<tamagui_1.Text color="$textSecondary" fontSize={14} marginTop="$0.5" numberOfLines={1}>
              {subtitle}
            </tamagui_1.Text>) : null}
        </tamagui_1.YStack>
        <tamagui_1.XStack alignItems="center" gap="$2" flexShrink={0}>
          {actionSlot}
          {rightSlot}
        </tamagui_1.XStack>
      </tamagui_1.XStack>
      {children}
    </tamagui_1.YStack>);
}
