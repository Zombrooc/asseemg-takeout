import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { LegacyReservedNumber } from "@/lib/takeout-api";

vi.mock("@/components/ui/collapsible", () => {
  let currentOpen = false;
  let currentOnOpenChange: ((open: boolean) => void) | undefined;

  return {
    Collapsible: ({
      open,
      onOpenChange,
      children,
    }: {
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
      children: ReactNode;
    }) => {
      currentOpen = Boolean(open);
      currentOnOpenChange = onOpenChange;
      return <div data-slot="collapsible">{children}</div>;
    },
    CollapsibleTrigger: ({
      onClick,
      children,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button
        type="button"
        {...props}
        onClick={(event) => {
          onClick?.(event);
          currentOnOpenChange?.(!currentOpen);
        }}
      >
        {children}
      </button>
    ),
    CollapsibleContent: ({
      children,
      ...props
    }: HTMLAttributes<HTMLDivElement>) => {
      if (!currentOpen) return null;
      return <div {...props}>{children}</div>;
    },
  };
});

import { ReservedNumbersCollapsible } from "../reserved-numbers-collapsible";

const reservedNumbers: LegacyReservedNumber[] = [
  { eventId: "evt-1", bibNumber: 16, label: "Equipe A", status: "available", createdAt: "2026-03-14T08:00:00Z" },
  { eventId: "evt-1", bibNumber: 17, label: null, status: "available", createdAt: "2026-03-14T08:00:00Z" },
];

describe("ReservedNumbersCollapsible", () => {
  it("starts collapsed, expands on click, and collapses again", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ReservedNumbersCollapsible
        reservedNumbers={reservedNumbers}
        isOpen={false}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByRole("button", { name: "Ver números reservados (2)" })).toBeInTheDocument();
    expect(screen.queryByText("#16")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver números reservados (2)" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);

    rerender(
      <ReservedNumbersCollapsible
        reservedNumbers={reservedNumbers}
        isOpen
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByRole("button", { name: "Ocultar números reservados" })).toBeInTheDocument();
    expect(screen.getByText("#16")).toBeInTheDocument();
    expect(screen.getByText("Equipe A")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ocultar números reservados" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <ReservedNumbersCollapsible
        reservedNumbers={reservedNumbers}
        isOpen={false}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByRole("button", { name: "Ver números reservados (2)" })).toBeInTheDocument();
    expect(screen.queryByText("#16")).not.toBeInTheDocument();
  });

  it("shows empty message and hides trigger when there are no reserved numbers", () => {
    render(
      <ReservedNumbersCollapsible
        reservedNumbers={[]}
        isOpen={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("Nenhuma reserva disponível. Adicione uma faixa para liberar números.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reservados/i })).not.toBeInTheDocument();
  });
});

