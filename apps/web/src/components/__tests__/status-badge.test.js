"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var react_1 = require("@testing-library/react");
var status_badge_1 = require("../status-badge");
(0, vitest_1.describe)("StatusBadge", function () {
    (0, vitest_1.it)("renders confirmed label", function () {
        (0, react_1.render)(<status_badge_1.StatusBadge status="confirmed"/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Confirmado")).toBeInTheDocument();
    });
    (0, vitest_1.it)("renders pending label", function () {
        (0, react_1.render)(<status_badge_1.StatusBadge status="pending"/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Pendente")).toBeInTheDocument();
    });
    (0, vitest_1.it)("renders duplicate label", function () {
        (0, react_1.render)(<status_badge_1.StatusBadge status="duplicate"/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Duplicado")).toBeInTheDocument();
    });
    (0, vitest_1.it)("renders failed label", function () {
        (0, react_1.render)(<status_badge_1.StatusBadge status="failed"/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Falho")).toBeInTheDocument();
    });
    (0, vitest_1.it)("uses custom label when provided", function () {
        (0, react_1.render)(<status_badge_1.StatusBadge status="confirmed" label="OK"/>);
        (0, vitest_1.expect)(react_1.screen.getByText("OK")).toBeInTheDocument();
    });
});
