"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfirmTakeoutModalLayout = getConfirmTakeoutModalLayout;
var DEFAULT_VERTICAL_MARGIN = 24;
var DEFAULT_MIN_CARD_HEIGHT = 320;
var KEYBOARD_EXTRA_BOTTOM_PADDING = 24;
function getConfirmTakeoutModalLayout(_a) {
    var windowHeight = _a.windowHeight, keyboardHeight = _a.keyboardHeight, isKeyboardVisible = _a.isKeyboardVisible, insets = _a.insets, _b = _a.verticalMargin, verticalMargin = _b === void 0 ? DEFAULT_VERTICAL_MARGIN : _b, _c = _a.minCardHeight, minCardHeight = _c === void 0 ? DEFAULT_MIN_CARD_HEIGHT : _c;
    var keyboardOffset = isKeyboardVisible ? keyboardHeight : 0;
    var availableHeight = windowHeight - insets.top - insets.bottom - keyboardOffset - verticalMargin * 2;
    var cardMaxHeight = Math.max(minCardHeight, availableHeight);
    return {
        justifyContent: isKeyboardVisible ? "flex-start" : "center",
        cardMaxHeight: cardMaxHeight,
        paddingTop: isKeyboardVisible ? Math.max(insets.top + 8, verticalMargin) : insets.top,
        paddingBottom: insets.bottom + (isKeyboardVisible ? KEYBOARD_EXTRA_BOTTOM_PADDING : 0),
    };
}
