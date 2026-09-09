"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = Input;
var tamagui_1 = require("tamagui");
var StyledInput = (0, tamagui_1.styled)(tamagui_1.Input, {
    backgroundColor: "$background",
    borderWidth: 1,
    borderColor: "$border",
    borderRadius: "$3",
    paddingHorizontal: "$3",
    paddingVertical: "$2",
    color: "$foreground",
    placeholderTextColor: "$textTertiary",
});
function Input(props) {
    return <StyledInput {...props}/>;
}
