"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
var tamagui_1 = require("tamagui");
var StyledCard = (0, tamagui_1.styled)(tamagui_1.YStack, {
    backgroundColor: "$card",
    borderRadius: "$4",
    padding: "$4",
    borderWidth: 1,
    borderColor: "$border",
});
function Card(props) {
    return <StyledCard {...props}/>;
}
