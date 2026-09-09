"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var confirm_takeout_modal_layout_1 = require("@/components/mobile/audit/confirm-takeout-modal.layout");
var modalFilePath = path_1.default.resolve(__dirname, "../../components/mobile/audit/confirm-takeout-modal.tsx");
function loadModalSource() {
    expect((0, fs_1.existsSync)(modalFilePath)).toBe(true);
    return (0, fs_1.readFileSync)(modalFilePath, "utf-8");
}
describe("confirm-takeout-modal keyboard regression", function () {
    it("keeps modal centered when keyboard is closed", function () {
        var layout = (0, confirm_takeout_modal_layout_1.getConfirmTakeoutModalLayout)({
            windowHeight: 820,
            keyboardHeight: 0,
            isKeyboardVisible: false,
            insets: { top: 24, bottom: 16 },
        });
        expect(layout.justifyContent).toBe("center");
        expect(layout.paddingBottom).toBe(16);
        expect(layout.cardMaxHeight).toBe(732);
    });
    it("aligns content to top and shrinks card maxHeight when keyboard is open", function () {
        var layout = (0, confirm_takeout_modal_layout_1.getConfirmTakeoutModalLayout)({
            windowHeight: 820,
            keyboardHeight: 300,
            isKeyboardVisible: true,
            insets: { top: 24, bottom: 16 },
        });
        expect(layout.justifyContent).toBe("flex-start");
        expect(layout.paddingTop).toBe(32);
        expect(layout.paddingBottom).toBe(40);
        expect(layout.cardMaxHeight).toBe(432);
    });
    it("keeps retirante input testIDs in modal source", function () {
        var source = loadModalSource();
        expect(source).toContain('testID="takeout-confirm-modal-retirante-nome"');
        expect(source).toContain('testID="takeout-confirm-modal-retirante-cpf"');
    });
});
