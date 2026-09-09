"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useResponsiveScale = useResponsiveScale;
var react_native_1 = require("react-native");
var BASE_WIDTH = 375;
/**
 * Hook para layout responsivo. Retorna escala baseada na largura da janela
 * (referência 375) e as dimensões atuais. Use scale(n) para padding, margin,
 * minHeight/minWidth e tamanhos; use width/height para % ou maxWidth.
 */
function useResponsiveScale() {
    var _a = (0, react_native_1.useWindowDimensions)(), width = _a.width, height = _a.height;
    var scale = function (size) { return (width / BASE_WIDTH) * size; };
    return { scale: scale, width: width, height: height };
}
