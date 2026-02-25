import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParticipantsTable } from "../participants-table";
import type { EventParticipant } from "@/lib/takeout-api";

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
});
