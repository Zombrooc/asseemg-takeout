"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("@testing-library/react");
var vitest_1 = require("vitest");
vitest_1.vi.mock("@/components/ui/collapsible", function () {
    var currentOpen = false;
    var currentOnOpenChange;
    return {
        Collapsible: function (_a) {
            var open = _a.open, onOpenChange = _a.onOpenChange, children = _a.children;
            currentOpen = Boolean(open);
            currentOnOpenChange = onOpenChange;
            return <div data-slot="collapsible">{children}</div>;
        },
        CollapsibleTrigger: function (_a) {
            var onClick = _a.onClick, children = _a.children, props = __rest(_a, ["onClick", "children"]);
            return (<button type="button" {...props} onClick={function (event) {
                    onClick === null || onClick === void 0 ? void 0 : onClick(event);
                    currentOnOpenChange === null || currentOnOpenChange === void 0 ? void 0 : currentOnOpenChange(!currentOpen);
                }}>
        {children}
      </button>);
        },
        CollapsibleContent: function (_a) {
            var children = _a.children, props = __rest(_a, ["children"]);
            if (!currentOpen)
                return null;
            return <div {...props}>{children}</div>;
        },
    };
});
var reserved_numbers_collapsible_1 = require("../reserved-numbers-collapsible");
var reservedNumbers = [
    { eventId: "evt-1", bibNumber: 16, label: "Equipe A", status: "available", createdAt: "2026-03-14T08:00:00Z" },
    { eventId: "evt-1", bibNumber: 17, label: null, status: "available", createdAt: "2026-03-14T08:00:00Z" },
];
(0, vitest_1.describe)("ReservedNumbersCollapsible", function () {
    (0, vitest_1.it)("starts collapsed, expands on click, and collapses again", function () {
        var onOpenChange = vitest_1.vi.fn();
        var rerender = (0, react_1.render)(<reserved_numbers_collapsible_1.ReservedNumbersCollapsible reservedNumbers={reservedNumbers} isOpen={false} onOpenChange={onOpenChange}/>).rerender;
        (0, vitest_1.expect)(react_1.screen.getByRole("button", { name: "Ver números reservados (2)" })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByText("#16")).not.toBeInTheDocument();
        react_1.fireEvent.click(react_1.screen.getByRole("button", { name: "Ver números reservados (2)" }));
        (0, vitest_1.expect)(onOpenChange).toHaveBeenCalledWith(true);
        rerender(<reserved_numbers_collapsible_1.ReservedNumbersCollapsible reservedNumbers={reservedNumbers} isOpen onOpenChange={onOpenChange}/>);
        (0, vitest_1.expect)(react_1.screen.getByRole("button", { name: "Ocultar números reservados" })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("#16")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText("Equipe A")).toBeInTheDocument();
        react_1.fireEvent.click(react_1.screen.getByRole("button", { name: "Ocultar números reservados" }));
        (0, vitest_1.expect)(onOpenChange).toHaveBeenCalledWith(false);
        rerender(<reserved_numbers_collapsible_1.ReservedNumbersCollapsible reservedNumbers={reservedNumbers} isOpen={false} onOpenChange={onOpenChange}/>);
        (0, vitest_1.expect)(react_1.screen.getByRole("button", { name: "Ver números reservados (2)" })).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByText("#16")).not.toBeInTheDocument();
    });
    (0, vitest_1.it)("shows empty message and hides trigger when there are no reserved numbers", function () {
        (0, react_1.render)(<reserved_numbers_collapsible_1.ReservedNumbersCollapsible reservedNumbers={[]} isOpen={false} onOpenChange={vitest_1.vi.fn()}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Nenhuma reserva disponível. Adicione uma faixa para liberar números.")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByRole("button", { name: /reservados/i })).not.toBeInTheDocument();
    });
});
