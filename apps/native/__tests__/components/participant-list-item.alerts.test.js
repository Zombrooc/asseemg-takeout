"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var tamaguiItemPath = path_1.default.resolve(__dirname, "../../components/mobile-tamagui/participant-list-item.tsx");
var herouiItemPath = path_1.default.resolve(__dirname, "../../components/takeout/participant-list-item.tsx");
function loadSource(filePath) {
    expect((0, fs_1.existsSync)(filePath)).toBe(true);
    return (0, fs_1.readFileSync)(filePath, "utf-8");
}
describe("participant list item alerts", function () {
    it("keeps alert prop and inline message rendering in tamagui variant", function () {
        var source = loadSource(tamaguiItemPath);
        expect(source).toContain("alerts?: ParticipantAlert[];");
        expect(source).toContain("testID={`participant-alert-icon-${id}`}");
        expect(source).toContain("{alert.message}");
    });
    it("keeps alert prop and inline message rendering in heroui variant", function () {
        var source = loadSource(herouiItemPath);
        expect(source).toContain("alerts?: ParticipantAlert[];");
        expect(source).toContain("testID={`participant-alert-icon-${id}`}");
        expect(source).toContain("{alert.message}");
    });
});
