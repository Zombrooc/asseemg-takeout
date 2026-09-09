"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var react_1 = require("@testing-library/react");
var audit_filters_1 = require("../audit-filters");
(0, vitest_1.describe)("AuditFilters", function () {
    (0, vitest_1.it)("renders status filter and calls onStatusChange when selection changes", function () {
        var onStatusChange = vitest_1.vi.fn();
        (0, react_1.render)(<audit_filters_1.AuditFilters statusFilter="" onStatusChange={onStatusChange}/>);
        var select = react_1.screen.getByRole("combobox", { name: /filtrar por status/i });
        react_1.fireEvent.change(select, { target: { value: "CONFIRMED" } });
        (0, vitest_1.expect)(onStatusChange).toHaveBeenCalled();
        (0, vitest_1.expect)(onStatusChange.mock.calls[0][0]).toBe("CONFIRMED");
    }, 10000);
    (0, vitest_1.it)("calls onClear when Limpar is clicked", function () {
        var onClear = vitest_1.vi.fn();
        (0, react_1.render)(<audit_filters_1.AuditFilters statusFilter="CONFIRMED" onStatusChange={function () { }} onClear={onClear}/>);
        var clearBtn = react_1.screen.getByRole("button", { name: /limpar filtros/i });
        react_1.fireEvent.click(clearBtn);
        (0, vitest_1.expect)(onClear).toHaveBeenCalled();
    });
});
