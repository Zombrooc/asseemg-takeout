import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import React, { type ReactNode } from "react";
import { ExportEventParticipantsButton } from "../export-event-participants-button";
import type { EventParticipant } from "@/lib/takeout-api";

const mocks = vi.hoisted(() => ({
  exportEventParticipantsFile: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/event-participants-export", () => ({
  exportEventParticipantsFile: mocks.exportEventParticipantsFile,
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({
    children,
    render,
    ...props
  }: {
    children: ReactNode;
    render?: React.ReactElement;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    render ? React.cloneElement(render, props, children) : <button {...props}>{children}</button>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

function renderWithQueryClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sampleParticipants: EventParticipant[] = [
  {
    id: "p-1",
    name: "Ana",
    cpf: "123",
    birthDate: "2000-01-01",
    ticketId: "t-1",
    sourceTicketId: "orig-1",
    ticketName: "5K",
    qrCode: "QR-1",
    checkinDone: false,
    customFormResponses: [],
  },
];

describe("ExportEventParticipantsButton", () => {
  beforeEach(() => {
    mocks.exportEventParticipantsFile.mockReset();
    mocks.toast.error.mockReset();
    mocks.toast.success.mockReset();
  });

  it("exports CSV using the full participant collection passed to the button", async () => {
    mocks.exportEventParticipantsFile.mockResolvedValue({ status: "saved", count: 1, path: "x.csv" });

    renderWithQueryClient(
      <ExportEventParticipantsButton
        eventId="ev-1"
        eventName="Evento 1"
        participants={sampleParticipants}
        sourceType="json_sync"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /exportar csv/i }));

    await waitFor(() =>
      expect(mocks.exportEventParticipantsFile).toHaveBeenCalledWith({
        eventId: "ev-1",
        eventName: "Evento 1",
        participants: sampleParticipants,
        sourceType: "json_sync",
        format: "csv",
      })
    );
    expect(mocks.toast.success).toHaveBeenCalledWith("Arquivo CSV salvo (1 participante(s)).");
  });

  it("exports JSON when selected", async () => {
    mocks.exportEventParticipantsFile.mockResolvedValue({ status: "saved", count: 1, path: "x.json" });

    renderWithQueryClient(
      <ExportEventParticipantsButton
        eventId="ev-1"
        eventName="Evento 1"
        participants={sampleParticipants}
        sourceType="legacy_csv"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /exportar json/i }));

    await waitFor(() =>
      expect(mocks.exportEventParticipantsFile).toHaveBeenCalledWith({
        eventId: "ev-1",
        eventName: "Evento 1",
        participants: sampleParticipants,
        sourceType: "legacy_csv",
        format: "json",
      })
    );
  });

  it("shows empty-state feedback and skips export", () => {
    renderWithQueryClient(
      <ExportEventParticipantsButton
        eventId="ev-1"
        eventName="Evento 1"
        participants={[]}
        sourceType="json_sync"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /exportar csv/i }));

    expect(mocks.toast.error).toHaveBeenCalledWith("Nenhum participante para exportar.");
    expect(mocks.exportEventParticipantsFile).not.toHaveBeenCalled();
  });

  it("stops silently when the save dialog is cancelled", async () => {
    mocks.exportEventParticipantsFile.mockResolvedValue({ status: "cancelled", count: 1 });

    renderWithQueryClient(
      <ExportEventParticipantsButton
        eventId="ev-1"
        eventName="Evento 1"
        participants={sampleParticipants}
        sourceType="json_sync"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /exportar csv/i }));

    await waitFor(() => expect(mocks.exportEventParticipantsFile).toHaveBeenCalled());
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });
});
