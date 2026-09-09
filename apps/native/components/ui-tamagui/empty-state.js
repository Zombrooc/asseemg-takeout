"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
var tamagui_1 = require("tamagui");
function EmptyState(_a) {
    var title = _a.title, description = _a.description, icon = _a.icon, action = _a.action;
    return (<tamagui_1.YStack flex={1} alignItems="center" justifyContent="center" padding="$4" gap="$3">
      {icon}
      <tamagui_1.Text color="$foreground" fontWeight="600" fontSize={16}>
        {title}
      </tamagui_1.Text>
      {description ? (<tamagui_1.Text color="$textSecondary" textAlign="center" fontSize={14}>
          {description}
        </tamagui_1.Text>) : null}
      {action}
    </tamagui_1.YStack>);
}
