import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("renders confirmed label", () => {
    render(<StatusBadge status="confirmed" />);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("renders pending label", () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pendente")).toBeInTheDocument();
  });

  it("renders duplicate label", () => {
    render(<StatusBadge status="duplicate" />);
    expect(screen.getByText("Duplicado")).toBeInTheDocument();
  });

  it("renders failed label", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("Falho")).toBeInTheDocument();
  });

  it("uses custom label when provided", () => {
    render(<StatusBadge status="confirmed" label="OK" />);
    expect(screen.getByText("OK")).toBeInTheDocument();
  });
});
