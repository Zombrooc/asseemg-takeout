import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  result: ArrayBuffer | null = null;
  onload: null | (() => void) = null;

  readAsArrayBuffer(file: Blob) {
    file
      .arrayBuffer()
      .then((buffer) => {
        this.result = buffer;
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
    const modelSelect = screen.getByRole("combobox");
    expect(modelSelect).toBeInTheDocument();
    expect(screen.queryByLabelText("Event ID")).not.toBeInTheDocument();
    fireEvent.change(modelSelect, {
      target: { value: "legacy_csv" },
    });
    expect(screen.getByLabelText("Nome do evento")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial")).toBeInTheDocument();
  });

  it("validates csv metadata before import", async () => {
    postImportLegacyCsv.mockResolvedValue({ imported: 1, errors: [] });
    render(<ImportPage />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "legacy_csv" },
    });
    const csvContent =
      "Número;Nome Completo;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\n1;Ana;Feminino;17979086937;08/03/2000;5KM;P;\n";
    const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
    const file = new File([csvContent], "legacy.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Importar e Salvar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Importar e Salvar"));
    expect(postImportLegacyCsv).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Nome do evento"), {
      target: { value: "Evento Teste" },
    });
    fireEvent.change(screen.getByLabelText("Data inicial"), {
      target: { value: "2026-03-06" },
    });
    fireEvent.click(screen.getByText("Importar e Salvar"));

    await waitFor(() => {
      expect(postImportLegacyCsv).toHaveBeenCalledTimes(1);
    });
  });

  it("accepts flexible legacy header variations", async () => {
    render(<ImportPage />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "legacy_csv" },
    });
    const csvContent =
      " numero ;  nome completo;sexo;cpf;data   de nascimento;modalidade (5km, 10km, caminhada ou kids);tamanho da camisa;equipe\n1;Ana;Feminino;17979086937;08/03/2000;5KM;P;\n";
    const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
    const file = new File([csvContent], "legacy-flex.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Importar e Salvar")).toBeInTheDocument();
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("rejects legacy csv when columns are out of order", async () => {
    render(<ImportPage />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "legacy_csv" },
    });
    const csvContent =
      "Nome Completo;Número;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\nAna;1;Feminino;17979086937;08/03/2000;5KM;P;\n";
    const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
    const file = new File([csvContent], "legacy-wrong-order.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Header legado inválido");
    });
  });
});
