import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ImportPage", () => {
  const TEST_TIMEOUT = 10_000;

  beforeEach(() => {
    postImportJson.mockReset();
    postImportLegacyCsv.mockReset();
    toastError.mockReset();
    vi.stubGlobal("FileReader", MockFileReader);
  });

  it("renders model selector and toggles csv metadata fields", () => {
    renderWithQueryClient(<ImportPage />);
    const modelSelect = screen.getByRole("combobox", { name: /modelo/i });
    expect(modelSelect).toBeInTheDocument();
    expect(screen.queryByLabelText("Event ID")).not.toBeInTheDocument();
    fireEvent.change(modelSelect, {
      target: { value: "legacy_csv" },
    });
    expect(screen.getByLabelText("Nome do evento")).toBeInTheDocument();
    expect(screen.getByLabelText("Data inicial")).toBeInTheDocument();
  }, TEST_TIMEOUT);

  it("validates csv metadata before import", async () => {
    postImportLegacyCsv.mockResolvedValue({ imported: 1, errors: [] });
    renderWithQueryClient(<ImportPage />);
    fireEvent.change(screen.getByRole("combobox", { name: /modelo/i }), {
      target: { value: "legacy_csv" },
    });
    const csvContent =
      "Número;Nome Completo;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\n1;Ana;Feminino;17979086937;08/03/2000;5KM;P;\n";
    const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
    const file = new File([csvContent], "legacy.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText("Mapear CPF")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Mapear Número"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Mapear Nome Completo"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Mapear CPF"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Mapear Data de Nascimento"), {
      target: { value: "4" },
    });

    await waitFor(() => {
      expect(screen.getByText("Importar e Salvar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Importar e Salvar"));
    expect(postImportLegacyCsv).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });

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
  }, TEST_TIMEOUT);

  it("auto-maps legacy headers with variations", async () => {
    renderWithQueryClient(<ImportPage />);
    fireEvent.change(screen.getByRole("combobox", { name: /modelo/i }), {
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
  }, TEST_TIMEOUT);

  it("accepts legacy csv when columns are out of order (manual mapping)", async () => {
    renderWithQueryClient(<ImportPage />);
    fireEvent.change(screen.getByRole("combobox", { name: /modelo/i }), {
      target: { value: "legacy_csv" },
    });
    const csvContent =
      "Nome Completo;Número;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\nAna;1;Feminino;17979086937;08/03/2000;5KM;P;\n";
    const input = screen.getByLabelText("Selecionar arquivo") as HTMLInputElement;
    const file = new File([csvContent], "legacy-wrong-order.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText("Mapear CPF")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Mapear Número"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Mapear Nome Completo"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Mapear CPF"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Mapear Data de Nascimento"), {
      target: { value: "4" },
    });

    await waitFor(() => {
      expect(screen.getByText("Importar e Salvar")).toBeInTheDocument();
    });
    expect(toastError).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);
});
