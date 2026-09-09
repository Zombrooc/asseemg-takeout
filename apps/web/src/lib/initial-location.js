"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNormalizedInitialPath = getNormalizedInitialPath;
exports.normalizeInitialLocation = normalizeInitialLocation;
function getNormalizedInitialPath(location) {
    var protocol = location.protocol, pathname = location.pathname, search = location.search, hash = location.hash;
    if (protocol === "file:") {
        return "/".concat(search).concat(hash);
    }
    if (pathname.endsWith("/index.html")) {
        var normalizedPath = pathname.slice(0, -"/index.html".length) || "/";
        return "".concat(normalizedPath).concat(search).concat(hash);
    }
    return null;
}
function normalizeInitialLocation(location, replaceState) {
    var normalizedPath = getNormalizedInitialPath(location);
    if (!normalizedPath)
        return;
    replaceState(null, "", normalizedPath);
}
