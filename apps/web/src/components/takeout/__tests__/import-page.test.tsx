import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ImportPage } from "../import-page";

const {
  postImportJson,
  postImportLegacyCsv,
  toastError,
} = vi.hoisted(() => ({
  postImportJson: vi.fn(),
  postImportLegacyCsv: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/lib/takeout-api", () => ({
  postImportJson,
  postImportLegacyCsv,
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: vi.fn(),
  },
}));

class MockFileReader {
  result: string | null = null;
  onload: null | (() => void) = null;

  readAsText(file: Blob) {
    file
      .text()
      .then((text) => {
        this.result = text;
        this.onload?.();
      })
      .catch(() => {
        this.result = null;
        this.onload?.();
      });
  }
}

describe("ImportPage", () => {
  beforeEach(() => {
    postImportJson.mockReset();
    postImportLegacyCsv.mockReset();
    toastError.mockReset();
    vi.stubGlobal("FileReader", MockFileReader);
  });

  it("renders model selector and toggles csv metadata fields", () => {
    render(<ImportPage />);
    expect(screen.getByLabelText("Modelo de importação")).toBeInTheDocument();
    expect(screen.queryByLabelText("Event ID")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Modelo de importação"), {
      target: { value: "legacy_csv" },
    });
    expect(screen.getByLabelText("Event ID")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome do evento")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial")).toBeInTheDocument();
  });

  it("validates csv metadata before import", async () => {
    postImportLegacyCsv.mockResolvedValue({ imported: 1, errors: [] });
    render(<ImportPage />);
    fireEvent.change(screen.getByLabelText("Modelo de importação"), {
      target: { value: "legacy_csv" },
    });
    const csvContent =
      "Número,Nome Completo,Sexo,CPF,Data de Nascimento,\"Modalidade (5km, 10km, Caminhada ou Kids)\",Tamanho da Camisa,Equipe\n1,Ana,Feminino,17979086937,08/03/2000,5KM,P,\n";
    const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
    const file = new File([csvContent], "legacy.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Importar e Salvar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Importar e Salvar"));
    expect(postImportLegacyCsv).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });
});
