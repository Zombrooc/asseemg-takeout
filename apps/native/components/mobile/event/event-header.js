"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventHeader = EventHeader;
var home_1 = require("@/components/mobile/home");
var ui_1 = require("@/components/ui");
function EventHeader(_a) {
    var title = _a.title, subtitle = _a.subtitle, _b = _a.isLive, isLive = _b === void 0 ? true : _b;
    return (<ui_1.TopBar title={title} subtitle={subtitle} rightSlot={<home_1.StatusPill isReachable={isLive}/>}/>);
}
