"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var modalFilePath = path_1.default.resolve(__dirname, "../../components/mobile/audit/confirm-takeout-modal.tsx");
function loadModalSource() {
    expect((0, fs_1.existsSync)(modalFilePath)).toBe(true);
    return (0, fs_1.readFileSync)(modalFilePath, "utf-8");
}
describe("confirm-takeout-modal alerts", function () {
    it("keeps alert prop and alert block in modal source", function () {
        var source = loadModalSource();
        expect(source).toContain("alerts?: ParticipantAlert[];");
        expect(source).toContain('testID="takeout-confirm-modal-alerts"');
        expect(source).toContain("Alertas para este participante");
    });
    it("keeps confirmation button gating independent from alerts", function () {
        var source = loadModalSource();
        expect(source).toContain("isDisabled={loading || !canConfirm}");
    });
});
