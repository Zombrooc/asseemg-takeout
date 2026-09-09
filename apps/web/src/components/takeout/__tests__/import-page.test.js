"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("@testing-library/react");
var vitest_1 = require("vitest");
var import_page_1 = require("../import-page");
var _a = vitest_1.vi.hoisted(function () { return ({
    postImportJson: vitest_1.vi.fn(),
    postImportLegacyCsv: vitest_1.vi.fn(),
    toastError: vitest_1.vi.fn(),
}); }), postImportJson = _a.postImportJson, postImportLegacyCsv = _a.postImportLegacyCsv, toastError = _a.toastError;
vitest_1.vi.mock("@/lib/takeout-api", function () { return ({
    postImportJson: postImportJson,
    postImportLegacyCsv: postImportLegacyCsv,
}); });
vitest_1.vi.mock("sonner", function () { return ({
    toast: {
        error: toastError,
        success: vitest_1.vi.fn(),
    },
}); });
var MockFileReader = /** @class */ (function () {
    function MockFileReader() {
        this.result = null;
        this.onload = null;
    }
    MockFileReader.prototype.readAsArrayBuffer = function (file) {
        var _this = this;
        file
            .arrayBuffer()
            .then(function (buffer) {
            var _a;
            _this.result = buffer;
            (_a = _this.onload) === null || _a === void 0 ? void 0 : _a.call(_this);
        })
            .catch(function () {
            var _a;
            _this.result = null;
            (_a = _this.onload) === null || _a === void 0 ? void 0 : _a.call(_this);
        });
    };
    return MockFileReader;
}());
function renderWithQueryClient(ui) {
    var queryClient = new react_query_1.QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    return (0, react_1.render)(<react_query_1.QueryClientProvider client={queryClient}>{ui}</react_query_1.QueryClientProvider>);
}
(0, vitest_1.describe)("ImportPage", function () {
    var TEST_TIMEOUT = 10000;
    (0, vitest_1.beforeEach)(function () {
        postImportJson.mockReset();
        postImportLegacyCsv.mockReset();
        toastError.mockReset();
        vitest_1.vi.stubGlobal("FileReader", MockFileReader);
    });
    (0, vitest_1.it)("renders model selector and toggles csv metadata fields", function () {
        renderWithQueryClient(<import_page_1.ImportPage />);
        var modelSelect = react_1.screen.getByRole("combobox", { name: /modelo/i });
        (0, vitest_1.expect)(modelSelect).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.queryByLabelText("Event ID")).not.toBeInTheDocument();
        react_1.fireEvent.change(modelSelect, {
            target: { value: "legacy_csv" },
        });
        (0, vitest_1.expect)(react_1.screen.getByLabelText("Nome do evento")).toBeInTheDocument();
        (0, vitest_1.expect)(react_1.screen.getByLabelText("Data inicial")).toBeInTheDocument();
    }, TEST_TIMEOUT);
    (0, vitest_1.it)("validates csv metadata before import", function () { return __awaiter(void 0, void 0, void 0, function () {
        var csvContent, input, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    postImportLegacyCsv.mockResolvedValue({ imported: 1, errors: [] });
                    renderWithQueryClient(<import_page_1.ImportPage />);
                    react_1.fireEvent.change(react_1.screen.getByRole("combobox", { name: /modelo/i }), {
                        target: { value: "legacy_csv" },
                    });
                    csvContent = "Número;Nome Completo;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\n1;Ana;Feminino;17979086937;08/03/2000;5KM;P;\n";
                    input = react_1.screen.getByLabelText("Selecionar arquivo");
                    file = new File([csvContent], "legacy.csv", { type: "text/csv" });
                    react_1.fireEvent.change(input, { target: { files: [file] } });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByLabelText("Mapear CPF")).toBeInTheDocument();
                        })];
                case 1:
                    _a.sent();
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Número"), {
                        target: { value: "0" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Nome Completo"), {
                        target: { value: "1" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear CPF"), {
                        target: { value: "3" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Data de Nascimento"), {
                        target: { value: "4" },
                    });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByText("Importar e Salvar")).toBeInTheDocument();
                        })];
                case 2:
                    _a.sent();
                    react_1.fireEvent.click(react_1.screen.getByText("Importar e Salvar"));
                    (0, vitest_1.expect)(postImportLegacyCsv).not.toHaveBeenCalled();
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(toastError).toHaveBeenCalled();
                        })];
                case 3:
                    _a.sent();
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Nome do evento"), {
                        target: { value: "Evento Teste" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Data inicial"), {
                        target: { value: "2026-03-06" },
                    });
                    react_1.fireEvent.click(react_1.screen.getByText("Importar e Salvar"));
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(postImportLegacyCsv).toHaveBeenCalledTimes(1);
                        })];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }, TEST_TIMEOUT);
    (0, vitest_1.it)("auto-maps legacy headers with variations", function () { return __awaiter(void 0, void 0, void 0, function () {
        var csvContent, input, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    renderWithQueryClient(<import_page_1.ImportPage />);
                    react_1.fireEvent.change(react_1.screen.getByRole("combobox", { name: /modelo/i }), {
                        target: { value: "legacy_csv" },
                    });
                    csvContent = " numero ;  nome completo;sexo;cpf;data   de nascimento;modalidade (5km, 10km, caminhada ou kids);tamanho da camisa;equipe\n1;Ana;Feminino;17979086937;08/03/2000;5KM;P;\n";
                    input = react_1.screen.getByLabelText("Selecionar arquivo");
                    file = new File([csvContent], "legacy-flex.csv", { type: "text/csv" });
                    react_1.fireEvent.change(input, { target: { files: [file] } });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByText("Importar e Salvar")).toBeInTheDocument();
                        })];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(toastError).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); }, TEST_TIMEOUT);
    (0, vitest_1.it)("accepts legacy csv when columns are out of order (manual mapping)", function () { return __awaiter(void 0, void 0, void 0, function () {
        var csvContent, input, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    renderWithQueryClient(<import_page_1.ImportPage />);
                    react_1.fireEvent.change(react_1.screen.getByRole("combobox", { name: /modelo/i }), {
                        target: { value: "legacy_csv" },
                    });
                    csvContent = "Nome Completo;Número;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\nAna;1;Feminino;17979086937;08/03/2000;5KM;P;\n";
                    input = react_1.screen.getByLabelText("Selecionar arquivo");
                    file = new File([csvContent], "legacy-wrong-order.csv", { type: "text/csv" });
                    react_1.fireEvent.change(input, { target: { files: [file] } });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByLabelText("Mapear CPF")).toBeInTheDocument();
                        })];
                case 1:
                    _a.sent();
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Número"), {
                        target: { value: "1" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Nome Completo"), {
                        target: { value: "0" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear CPF"), {
                        target: { value: "3" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Data de Nascimento"), {
                        target: { value: "4" },
                    });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByText("Importar e Salvar")).toBeInTheDocument();
                        })];
                case 2:
                    _a.sent();
                    (0, vitest_1.expect)(toastError).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); }, TEST_TIMEOUT);
    (0, vitest_1.it)("repairs mojibake values in legacy preview", function () { return __awaiter(void 0, void 0, void 0, function () {
        var csvContent, input, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    renderWithQueryClient(<import_page_1.ImportPage />);
                    react_1.fireEvent.change(react_1.screen.getByRole("combobox", { name: /modelo/i }), {
                        target: { value: "legacy_csv" },
                    });
                    csvContent = "N\u00C3\u00BAmero;Nome Completo;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\n1;Jo\u00C3\u00A3o da Silva;Masculino;17979086937;08/03/2000;5KM;P;\n";
                    input = react_1.screen.getByLabelText("Selecionar arquivo");
                    file = new File([csvContent], "legacy-mojibake.csv", { type: "text/csv" });
                    react_1.fireEvent.change(input, { target: { files: [file] } });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByText("Jo\u00E3o da Silva")).toBeInTheDocument();
                        })];
                case 1:
                    _a.sent();
                    (0, vitest_1.expect)(toastError).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); }, TEST_TIMEOUT);
    (0, vitest_1.it)("does not include blank row with only number in mapped CSV", function () { return __awaiter(void 0, void 0, void 0, function () {
        var csvContent, input, file, formData, mappedFile, mappedContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    postImportLegacyCsv.mockResolvedValue({ imported: 1, errors: [] });
                    renderWithQueryClient(<import_page_1.ImportPage />);
                    react_1.fireEvent.change(react_1.screen.getByRole("combobox", { name: /modelo/i }), {
                        target: { value: "legacy_csv" },
                    });
                    csvContent = "N\u00FAmero;Nome Completo;Sexo;CPF;Data de Nascimento;Modalidade (5km, 10km, Caminhada ou Kids);Tamanho da Camisa;Equipe\n1;Ana;Feminino;17979086937;08/03/2000;5KM;P;\n2;;;;;;;\n";
                    input = react_1.screen.getByLabelText("Selecionar arquivo");
                    file = new File([csvContent], "legacy-number-only-row.csv", { type: "text/csv" });
                    react_1.fireEvent.change(input, { target: { files: [file] } });
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(react_1.screen.getByLabelText("Mapear CPF")).toBeInTheDocument();
                        })];
                case 1:
                    _a.sent();
                    react_1.fireEvent.change(react_1.screen.getByLabelText(/Mapear N.mero/), {
                        target: { value: "0" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Nome Completo"), {
                        target: { value: "1" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear CPF"), {
                        target: { value: "3" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Mapear Data de Nascimento"), {
                        target: { value: "4" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Nome do evento"), {
                        target: { value: "Evento Teste" },
                    });
                    react_1.fireEvent.change(react_1.screen.getByLabelText("Data inicial"), {
                        target: { value: "2026-03-06" },
                    });
                    react_1.fireEvent.click(react_1.screen.getByText("Importar e Salvar"));
                    return [4 /*yield*/, (0, react_1.waitFor)(function () {
                            (0, vitest_1.expect)(postImportLegacyCsv).toHaveBeenCalledTimes(1);
                        })];
                case 2:
                    _a.sent();
                    formData = postImportLegacyCsv.mock.calls[0][0];
                    mappedFile = formData.get("file");
                    return [4 /*yield*/, mappedFile.text()];
                case 3:
                    mappedContent = _a.sent();
                    (0, vitest_1.expect)(mappedContent).toContain('"1","Ana"');
                    (0, vitest_1.expect)(mappedContent).not.toContain('"2","","","","","","",""');
                    return [2 /*return*/];
            }
        });
    }); }, TEST_TIMEOUT);
});
