import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditPage } from "../audit-page";

const { getAudit, getEvents } = vi.hoisted(() => ({
  getAudit: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@/lib/takeout-api", () => ({
  getAudit,
  getEvents,
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AuditPage", () => {
  beforeEach(() => {
    getEvents.mockResolvedValue([
      { eventId: "event-1", name: "Evento 1" },
      { eventId: "event-2", name: "Evento 2" },
    ]);
    getAudit.mockResolvedValue([]);
  });

  it("uses the event context and hides the event selector", async () => {
    renderWithQueryClient(<AuditPage initialEventId="event-2" />);

    await waitFor(() => {
      expect(getAudit).toHaveBeenCalledWith({ eventId: "event-2" });
    });
    await waitFor(() => {
      expect(screen.getAllByText(/Evento 2/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByLabelText("Selecionar evento da auditoria")).not.toBeInTheDocument();
  });

  it("keeps the event selector when opened without an event context", async () => {
    renderWithQueryClient(<AuditPage />);

    expect(await screen.findByLabelText("Selecionar evento da auditoria")).toBeInTheDocument();
    await waitFor(() => {
      expect(getAudit).toHaveBeenCalledWith({ eventId: "event-1" });
    });
  });
});
