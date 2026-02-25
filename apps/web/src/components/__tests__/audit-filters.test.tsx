import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditFilters } from "../audit-filters";

describe("AuditFilters", () => {
  it("renders status filter and calls onStatusChange when selection changes", () => {
    const onStatusChange = vi.fn();
    render(
      <AuditFilters statusFilter="" onStatusChange={onStatusChange} />,
    );
    const select = screen.getByRole("combobox", { name: /filtrar por status/i });
    fireEvent.change(select, { target: { value: "CONFIRMED" } });
    expect(onStatusChange).toHaveBeenCalled();
    expect(onStatusChange.mock.calls[0][0]).toBe("CONFIRMED");
  }, 10_000);

  it("calls onClear when Limpar is clicked", () => {
    const onClear = vi.fn();
    render(
      <AuditFilters
        statusFilter="CONFIRMED"
        onStatusChange={() => {}}
        onClear={onClear}
      />,
    );
    const clearBtn = screen.getByRole("button", { name: /limpar filtros/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalled();
  });
});
