"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vitest_1 = require("vitest");
var react_1 = require("@testing-library/react");
var participants_table_1 = require("../participants-table");
vitest_1.vi.mock("@/components/ui/button", function () { return ({
    Button: function (props) { return <button {...props}/>; },
}); });
var mockParticipants = [
    {
        id: "p1",
        name: "João Silva",
        cpf: "12345678900",
        ticketId: "t1",
        sourceTicketId: "t1",
        qrCode: "qr1",
        checkinDone: false,
    },
    {
        id: "p2",
        name: "Maria Santos",
        cpf: "98765432100",
        ticketId: "t2",
        sourceTicketId: "t2",
        qrCode: "qr2",
        checkinDone: true,
    },
];
var participantAlerts = {
    p1: [
        {
            code: "invalid_cpf",
            message: "CPF inválido.",
        },
    ],
};
(0, vitest_1.describe)("ParticipantsTable", function () {
    (0, vitest_1.it)("renders event name and participant count", function () {
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento Teste" participants={mockParticipants}/>);
        (0, vitest_1.expect)(react_1.screen.getByText("Evento Teste")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByText(/1 confirmados · 1 pendentes/)).toBeInTheDocument();
    });
    (0, vitest_1.it)("renders participant names and status badges", function () {
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento" participants={mockParticipants}/>);
        (0, vitest_1.expect)(react_1.screen.getAllByText("João Silva").length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(react_1.screen.getAllByText("Maria Santos").length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(react_1.screen.getAllByText("Pendente").length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(react_1.screen.getAllByText("Confirmado").length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)("calls onConfirm when Confirm button is clicked", function () {
        var onConfirm = vitest_1.vi.fn();
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento" participants={mockParticipants} onConfirm={onConfirm}/>);
        var confirmBtn = react_1.screen.getByRole("button", { name: /confirmar/i });
        react_1.fireEvent.click(confirmBtn);
        (0, vitest_1.expect)(onConfirm).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(onConfirm).toHaveBeenCalledWith(mockParticipants[0]);
    });
    (0, vitest_1.it)("shows Edit button only for pending participants and calls onEdit", function () {
        var onEdit = vitest_1.vi.fn();
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento" participants={mockParticipants} onEdit={onEdit}/>);
        var editBtn = react_1.screen.getByRole("button", { name: /editar/i });
        react_1.fireEvent.click(editBtn);
        (0, vitest_1.expect)(onEdit).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(onEdit).toHaveBeenCalledWith(mockParticipants[0]);
        (0, vitest_1.expect)(react_1.screen.getAllByRole("button", { name: /editar/i })).toHaveLength(1);
    });
    (0, vitest_1.it)("renders empty state when no participants are available", function () {
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento" participants={[]}/>);
        (0, vitest_1.expect)(react_1.screen.getByText(/nenhum participante encontrado/i)).toBeInTheDocument();
    });
    (0, vitest_1.it)("renders alert icon on the left with native tooltip details", function () {
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento" participants={mockParticipants} participantAlerts={participantAlerts}/>);
        (0, vitest_1.expect)(react_1.screen.getByRole("columnheader", { name: "Alerta" })).toBeInTheDocument();
        var icon = react_1.screen.getByLabelText("CPF inválido.");
        (0, vitest_1.expect)(icon).toHaveAttribute("title", "CPF inválido.");
    });
    (0, vitest_1.it)("does not render alert icon for participants without alerts", function () {
        (0, react_1.render)(<participants_table_1.ParticipantsTable eventName="Evento" participants={mockParticipants}/>);
        (0, vitest_1.expect)(react_1.screen.queryByLabelText("CPF inválido.")).not.toBeInTheDocument();
    });
});
