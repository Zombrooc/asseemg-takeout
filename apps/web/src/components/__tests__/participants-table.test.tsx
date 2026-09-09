import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";
import { ParticipantsTable } from "../participants-table";
import type { EventParticipant } from "@/lib/takeout-api";
import type { ParticipantAlert } from "@pickup/api/legacy-participant-alerts";

vi.mock("@/components/ui/button", () => ({
  Button: (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));

const mockParticipants: EventParticipant[] = [
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
const participantAlerts: Record<string, ParticipantAlert[]> = {
  p1: [
    {
      code: "invalid_cpf",
      message: "CPF inválido.",
    },
  ],
};

describe("ParticipantsTable", () => {
  it("renders event name and participant count", () => {
    render(
      <ParticipantsTable eventName="Evento Teste" participants={mockParticipants} />,
    );
    expect(screen.getByText("Evento Teste")).toBeInTheDocument();
    expect(screen.getByText(/1 confirmados · 1 pendentes/)).toBeInTheDocument();
  });

  it("renders participant names and status badges", () => {
    render(
      <ParticipantsTable eventName="Evento" participants={mockParticipants} />,
    );
    expect(screen.getAllByText("João Silva").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maria Santos").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Pendente").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Confirmado").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onConfirm when Confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <ParticipantsTable
        eventName="Evento"
        participants={mockParticipants}
        onConfirm={onConfirm}
      />,
    );
    const confirmBtn = screen.getByRole("button", { name: /confirmar/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(mockParticipants[0]);
  });

  it("shows Edit button only for pending participants and calls onEdit", () => {
    const onEdit = vi.fn();
    render(
      <ParticipantsTable eventName="Evento" participants={mockParticipants} onEdit={onEdit} />,
    );
    const editBtn = screen.getByRole("button", { name: /editar/i });
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(mockParticipants[0]);
    expect(screen.getAllByRole("button", { name: /editar/i })).toHaveLength(1);
  });

  it("renders empty state when no participants are available", () => {
    render(<ParticipantsTable eventName="Evento" participants={[]} />);
    expect(screen.getByText(/nenhum participante encontrado/i)).toBeInTheDocument();
  });

  it("renders alert icon on the left with native tooltip details", () => {
    render(
      <ParticipantsTable
        eventName="Evento"
        participants={mockParticipants}
        participantAlerts={participantAlerts}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Alerta" })).toBeInTheDocument();
    const icon = screen.getByLabelText("CPF inválido.");
    expect(icon).toHaveAttribute("title", "CPF inválido.");
  });

  it("does not render alert icon for participants without alerts", () => {
    render(<ParticipantsTable eventName="Evento" participants={mockParticipants} />);
    expect(screen.queryByLabelText("CPF inválido.")).not.toBeInTheDocument();
  });
});
