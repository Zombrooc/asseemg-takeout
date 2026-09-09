"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionPrompt = PermissionPrompt;
var ui_1 = require("@/components/ui");
var primitives_1 = require("@/lib/primitives");
function PermissionPrompt(_a) {
    var title = _a.title, description = _a.description, onConfirm = _a.onConfirm, onBack = _a.onBack;
    return (<>
      <primitives_1.Text className="text-foreground font-medium mb-2">{title}</primitives_1.Text>
      <primitives_1.Text className="text-muted-foreground text-sm mb-4">{description}</primitives_1.Text>
      <ui_1.Button className="px-4 py-3" onPress={onConfirm}>Permitir câmera</ui_1.Button>
      <ui_1.Button variant="bordered" className="px-4 py-3 mt-3" onPress={onBack}>Voltar</ui_1.Button>
    </>);
}
