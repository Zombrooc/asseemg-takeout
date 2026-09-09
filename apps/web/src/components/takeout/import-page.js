"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportPage = ImportPage;
var react_query_1 = require("@tanstack/react-query");
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var input_1 = require("@/components/ui/input");
var label_1 = require("@/components/ui/label");
var table_1 = require("@/components/ui/table");
var takeout_api_1 = require("@/lib/takeout-api");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var sonner_1 = require("sonner");
var LEGACY_FIELDS = [
    { key: "number", label: "Número", required: true },
    { key: "fullName", label: "Nome Completo", required: true },
    { key: "cpf", label: "CPF", required: false },
    { key: "birthDate", label: "Data de Nascimento", required: false },
    { key: "sex", label: "Sexo", required: false },
    { key: "modality", label: "Modalidade", required: false },
    { key: "shirtSize", label: "Tamanho da Camisa", required: false },
    { key: "team", label: "Equipe", required: false },
];
var LEGACY_HEADERS = [
    "Número",
    "Nome Completo",
    "Sexo",
    "CPF",
    "Data de Nascimento",
    "Modalidade (5km, 10km, Caminhada ou Kids)",
    "Tamanho da Camisa",
    "Equipe",
];
var MOJIBAKE_PATTERN = /[\u00C3\u00C2\uFFFD]/g;
var MAX_MOJIBAKE_REPAIR_PASSES = 3;
function mojibakeScore(value) {
    var _a, _b;
    return (_b = (_a = value.match(MOJIBAKE_PATTERN)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
}
function tryDecodeLatin1ishAsUtf8(value) {
    var bytes = new Uint8Array(value.length);
    for (var index = 0; index < value.length; index += 1) {
        var code = value.charCodeAt(index);
        if (code > 0xff) {
            return null;
        }
        bytes[index] = code;
    }
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    catch (_a) {
        return null;
    }
}
function repairMojibakeConservative(value) {
    var current = value;
    for (var attempt = 0; attempt < MAX_MOJIBAKE_REPAIR_PASSES; attempt += 1) {
        var repaired = tryDecodeLatin1ishAsUtf8(current);
        if (!repaired || repaired === current) {
            break;
        }
        if (mojibakeScore(repaired) >= mojibakeScore(current)) {
            break;
        }
        current = repaired;
    }
    return current;
}
function sanitizeCsvValue(value) {
    return repairMojibakeConservative(value).trim();
}
function normalizeHeader(value) {
    return value
        .trim()
        .replace(/^\uFEFF/, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");
}
function parseCsvLine(line, delimiter) {
    var out = [];
    var current = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i += 1) {
        var char = line[i];
        if (char === '"') {
            var next = line[i + 1];
            if (inQuotes && next === '"') {
                current += '"';
                i += 1;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === delimiter && !inQuotes) {
            out.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    out.push(current.trim());
    return out;
}
function detectDelimiter(headerLine) {
    var headerNoBom = headerLine.replace(/^\uFEFF/, "");
    var comma = parseCsvLine(headerNoBom, ",");
    var semicolon = parseCsvLine(headerNoBom, ";");
    if (semicolon.length > comma.length)
        return ";";
    if (comma.length > semicolon.length)
        return ",";
    if (headerNoBom.includes(";") && !headerNoBom.includes(","))
        return ";";
    return ",";
}
function parseGenericCsv(content) {
    var repairedContent = repairMojibakeConservative(content);
    var lines = repairedContent
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return line.length > 0; });
    if (lines.length < 2) {
        throw new Error("CSV vazio");
    }
    var delimiter = detectDelimiter(lines[0]);
    var headers = parseCsvLine(lines[0].replace(/^\uFEFF/, ""), delimiter).map(sanitizeCsvValue);
    var rows = lines
        .slice(1)
        .map(function (line) { return parseCsvLine(line, delimiter).map(sanitizeCsvValue); })
        .filter(function (row) { return row.some(function (cell) { return cell.length > 0; }); });
    return { headers: headers, rows: rows, delimiter: delimiter };
}
function csvEscape(value) {
    var str = String(value !== null && value !== void 0 ? value : "");
    return "\"".concat(str.replace(/"/g, '""'), "\"");
}
var LEGACY_FIELD_ALIASES = {
    number: ["numero", "número", "bib", "bib number", "bib_number", "numero atleta"],
    fullName: ["nome completo", "nome", "nome do participante", "participante", "name"],
    cpf: ["cpf", "documento", "documento cpf"],
    birthDate: ["data de nascimento", "nascimento", "birth date", "data_nascimento"],
    sex: ["sexo", "genero", "gênero", "gender"],
    modality: ["modalidade", "categoria", "prova", "race"],
    shirtSize: ["tamanho da camisa", "tamanho camisa", "camisa", "shirt size"],
    team: ["equipe", "time", "assessoria", "team"],
};
function autoMapHeaders(headers) {
    var _a;
    var normalized = headers.map(function (header) { return normalizeHeader(header); });
    var taken = new Set();
    var out = {};
    for (var _i = 0, LEGACY_FIELDS_1 = LEGACY_FIELDS; _i < LEGACY_FIELDS_1.length; _i++) {
        var field = LEGACY_FIELDS_1[_i];
        var aliases = (_a = LEGACY_FIELD_ALIASES[field.key]) !== null && _a !== void 0 ? _a : [];
        var aliasSet = new Set(aliases.map(function (alias) { return normalizeHeader(alias); }));
        var found = null;
        for (var idx = 0; idx < normalized.length; idx += 1) {
            if (taken.has(idx))
                continue;
            if (aliasSet.has(normalized[idx])) {
                found = idx;
                break;
            }
        }
        if (found != null)
            taken.add(found);
        out[field.key] = found;
    }
    return out;
}
function mapRowToLegacy(row, mapping) {
    var pick = function (key) {
        var _a;
        var idx = mapping[key];
        if (idx == null)
            return "";
        return sanitizeCsvValue((_a = row[idx]) !== null && _a !== void 0 ? _a : "");
    };
    return {
        number: pick("number"),
        fullName: pick("fullName"),
        sex: pick("sex"),
        cpf: pick("cpf"),
        birthDate: pick("birthDate"),
        modality: pick("modality"),
        shirtSize: pick("shirtSize"),
        team: pick("team"),
    };
}
function isLegacyRowBlankOrNumberOnly(legacy) {
    var hasOtherData = [
        legacy.fullName,
        legacy.sex,
        legacy.cpf,
        legacy.birthDate,
        legacy.modality,
        legacy.shirtSize,
        legacy.team,
    ].some(function (value) { return value.trim().length > 0; });
    return !hasOtherData;
}
function mapRowsToLegacy(rows, mapping) {
    return rows.map(function (row) { return mapRowToLegacy(row, mapping); }).filter(function (legacy) { return !isLegacyRowBlankOrNumberOnly(legacy); });
}
function buildLegacyCsv(rows, mapping) {
    var header = __spreadArray([], LEGACY_HEADERS, true).map(csvEscape).join(",");
    var mappedRows = mapRowsToLegacy(rows, mapping).map(function (legacy) {
        var cells = [
            legacy.number,
            legacy.fullName,
            legacy.sex,
            legacy.cpf,
            legacy.birthDate,
            legacy.modality,
            legacy.shirtSize,
            legacy.team,
        ];
        return cells.map(csvEscape).join(",");
    });
    return __spreadArray([header], mappedRows, true).join("\n");
}
function decodeUtf8OrWindows1252(content) {
    var utf8 = new TextDecoder("utf-8");
    var utf8Text = utf8.decode(content);
    if (!utf8Text.includes("\uFFFD")) {
        return utf8Text;
    }
    return new TextDecoder("windows-1252").decode(content);
}
function ImportPage() {
    var _this = this;
    var _a;
    var fileInputRef = (0, react_1.useRef)(null);
    var _b = (0, react_1.useState)("json_sync"), mode = _b[0], setMode = _b[1];
    var _c = (0, react_1.useState)(null), file = _c[0], setFile = _c[1];
    var _d = (0, react_1.useState)(null), parsedJson = _d[0], setParsedJson = _d[1];
    var _e = (0, react_1.useState)(null), legacyCsv = _e[0], setLegacyCsv = _e[1];
    var _f = (0, react_1.useState)(function () {
        return LEGACY_FIELDS.reduce(function (acc, field) {
            acc[field.key] = null;
            return acc;
        }, {});
    }), legacyMapping = _f[0], setLegacyMapping = _f[1];
    var _g = (0, react_1.useState)(false), dragOver = _g[0], setDragOver = _g[1];
    var _h = (0, react_1.useState)(""), eventName = _h[0], setEventName = _h[1];
    var _j = (0, react_1.useState)(""), eventStartDate = _j[0], setEventStartDate = _j[1];
    var _k = (0, react_1.useState)(null), legacyImportResult = _k[0], setLegacyImportResult = _k[1];
    var resetParsedState = (0, react_1.useCallback)(function () {
        setParsedJson(null);
        setLegacyCsv(null);
        setLegacyMapping(LEGACY_FIELDS.reduce(function (acc, field) {
            acc[field.key] = null;
            return acc;
        }, {}));
        setLegacyImportResult(null);
    }, []);
    var readFile = (0, react_1.useCallback)(function (f) {
        var reader = new FileReader();
        reader.onload = function () {
            try {
                if (mode === "json_sync") {
                    if (!(reader.result instanceof ArrayBuffer)) {
                        throw new Error("Arquivo inválido");
                    }
                    var text_1 = new TextDecoder("utf-8", { fatal: true }).decode(reader.result);
                    var data = JSON.parse(text_1);
                    if (!data.eventId || !Array.isArray(data.participants)) {
                        throw new Error("JSON inválido");
                    }
                    setParsedJson(data);
                    setLegacyCsv(null);
                    return;
                }
                if (!(reader.result instanceof ArrayBuffer)) {
                    throw new Error("Arquivo inválido");
                }
                var text = repairMojibakeConservative(decodeUtf8OrWindows1252(reader.result));
                var parsed = parseGenericCsv(text);
                setLegacyCsv(parsed);
                setLegacyMapping(autoMapHeaders(parsed.headers));
                setParsedJson(null);
            }
            catch (err) {
                sonner_1.toast.error(err instanceof Error ? err.message : "Arquivo inválido");
                resetParsedState();
            }
        };
        reader.readAsArrayBuffer(f);
    }, [mode, resetParsedState]);
    var onFileChange = (0, react_1.useCallback)(function (e) {
        var _a;
        var f = (_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!f)
            return;
        setFile(f);
        resetParsedState();
        readFile(f);
    }, [readFile, resetParsedState]);
    var handleDrop = (0, react_1.useCallback)(function (e) {
        var _a;
        e.preventDefault();
        setDragOver(false);
        var f = (_a = e.dataTransfer.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!f)
            return;
        var valid = mode === "json_sync"
            ? f.name.endsWith(".json") || f.type === "application/json"
            : f.name.endsWith(".csv") || f.type === "text/csv";
        if (!valid) {
            sonner_1.toast.error(mode === "json_sync" ? "Selecione um arquivo JSON" : "Selecione um arquivo CSV");
            return;
        }
        setFile(f);
        resetParsedState();
        readFile(f);
    }, [mode, readFile, resetParsedState]);
    var mappingValidation = (0, react_1.useMemo)(function () {
        var requiredKeys = LEGACY_FIELDS.filter(function (field) { return field.required; }).map(function (field) { return field.key; });
        var selectedRequired = requiredKeys.map(function (key) { return legacyMapping[key]; }).filter(function (v) { return v != null; });
        var hasAllRequired = requiredKeys.every(function (key) { return legacyMapping[key] != null; });
        var uniqueRequired = new Set(selectedRequired).size === selectedRequired.length;
        return { hasAllRequired: hasAllRequired, uniqueRequired: uniqueRequired, valid: hasAllRequired && uniqueRequired };
    }, [legacyMapping]);
    var mappedLegacyRows = (0, react_1.useMemo)(function () { return (legacyCsv ? mapRowsToLegacy(legacyCsv.rows, legacyMapping) : []); }, [legacyCsv, legacyMapping]);
    var importMutation = (0, react_query_1.useMutation)({
        mutationFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var csv, mappedFile, form;
            return __generator(this, function (_a) {
                if (mode === "json_sync") {
                    if (!parsedJson)
                        throw new Error("Selecione um arquivo JSON válido");
                    return [2 /*return*/, (0, takeout_api_1.postImportJson)(parsedJson)];
                }
                if (!file || !legacyCsv)
                    throw new Error("Selecione um arquivo CSV válido");
                if (!mappingValidation.valid) {
                    throw new Error("Preencha o mapeamento obrigatório do CSV");
                }
                if (!eventName.trim() || !eventStartDate.trim()) {
                    throw new Error("Preencha Nome do evento e Data inicial");
                }
                csv = buildLegacyCsv(legacyCsv.rows, legacyMapping);
                mappedFile = new File([csv], file.name || "legacy.csv", { type: "text/csv" });
                form = new FormData();
                form.append("eventName", eventName.trim());
                form.append("eventStartDate", eventStartDate.trim());
                form.append("file", mappedFile);
                return [2 /*return*/, (0, takeout_api_1.postImportLegacyCsv)(form)];
            });
        }); },
        onSuccess: function (res) {
            if (mode === "json_sync") {
                var payload = res;
                sonner_1.toast.success("".concat(payload.participants.length, " participante(s) importado(s)"));
                setParsedJson(payload);
            }
            else {
                var payload = res;
                setLegacyImportResult(payload);
                sonner_1.toast.success("".concat(payload.imported, " participante(s) legado(s) importado(s)"));
            }
        },
        onError: function (err) { return sonner_1.toast.error(err instanceof Error ? err.message : "Erro ao importar"); },
    });
    var listJson = (_a = parsedJson === null || parsedJson === void 0 ? void 0 : parsedJson.participants) !== null && _a !== void 0 ? _a : [];
    var showImportButton = mode === "json_sync" ? parsedJson != null : legacyCsv != null && mappingValidation.valid;
    var title = mode === "json_sync" ? "Importar JSON (checkin-sync)" : "Importar CSV legado";
    var accept = mode === "json_sync" ? ".json,application/json" : ".csv,text/csv";
    var icon = (0, react_1.useMemo)(function () { return (mode === "json_sync" ? <lucide_react_1.FileJson className="size-10 text-muted-foreground" aria-hidden/> : <lucide_react_1.FileSpreadsheet className="size-10 text-muted-foreground" aria-hidden/>); }, [mode]);
    return (<main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">{title}</h1>

      <card_1.Card>
        <card_1.CardContent className="space-y-2 pt-6">
          <label_1.Label htmlFor="import-model">Modelo de importação</label_1.Label>
          <select id="import-model" aria-label="Modelo de importação" className="h-10 w-full rounded-md border bg-background px-3" value={mode} onChange={function (event) {
            setMode(event.target.value);
            setFile(null);
            resetParsedState();
        }}>
            <option value="json_sync">JSON atual (.json)</option>
            <option value="legacy_csv">Sistema legado (.csv)</option>
          </select>
        </card_1.CardContent>
      </card_1.Card>

      {mode === "legacy_csv" ? (<card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="text-lg">Metadados do evento</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label_1.Label htmlFor="legacy-event-name">Nome do evento</label_1.Label>
              <input_1.Input id="legacy-event-name" aria-label="Nome do evento" value={eventName} onChange={function (e) { return setEventName(e.target.value); }}/>
            </div>
            <div className="space-y-2">
              <label_1.Label htmlFor="legacy-event-date">Data inicial</label_1.Label>
              <input_1.Input id="legacy-event-date" aria-label="Data inicial" type="date" value={eventStartDate} onChange={function (e) { return setEventStartDate(e.target.value); }}/>
            </div>
          </card_1.CardContent>
        </card_1.Card>) : null}

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle className="text-lg">Upload</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <div role="button" tabIndex={0} onClick={function () { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }} onKeyDown={function (e) { var _a; return e.key === "Enter" && ((_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click()); }} onDrop={handleDrop} onDragOver={function (e) {
            e.preventDefault();
            setDragOver(true);
        }} onDragLeave={function (e) {
            e.preventDefault();
            setDragOver(false);
        }} className={(0, utils_1.cn)("flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors", dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50")} aria-label={mode === "json_sync" ? "Arraste um arquivo JSON ou clique para selecionar" : "Arraste um arquivo CSV ou clique para selecionar"}>
            <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={onFileChange} aria-label="Selecionar arquivo"/>
            {icon}
            <p className="text-sm font-medium">
              {file ? file.name : "Arraste um arquivo ou clique para selecionar"}
            </p>
            {file != null ? (<p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>) : null}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardContent className="flex gap-2 pt-4">
          <lucide_react_1.Info className="size-5 shrink-0 text-primary" aria-hidden/>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Requisitos do arquivo</p>
            {mode === "json_sync" ? (<ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Formato JSON do checkin-sync (thevent)</li>
                <li>
                  Campos obrigatórios: <code>eventId</code>, <code>participants</code>
                </li>
                <li>
                  Cada participante com <code>seatId</code>, <code>ticketId</code>, <code>participantName</code>,{" "}
                  <code>cpf</code>
                </li>
              </ul>) : (<ul className="mt-1 list-inside list-disc space-y-0.5">
                <li>Pode ter colunas extras ou nomes diferentes</li>
                <li>Você precisará mapear as colunas obrigatórias</li>
              </ul>)}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {mode === "legacy_csv" && legacyCsv != null ? (<card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="text-lg">Mapeamento do CSV</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            {LEGACY_FIELDS.map(function (field) {
                var selected = legacyMapping[field.key];
                return (<div key={field.key} className="space-y-2">
                  <label_1.Label htmlFor={"map-".concat(field.key)}>
                    {field.label} {field.required ? "*" : "(opcional)"}
                  </label_1.Label>
                  <select id={"map-".concat(field.key)} aria-label={"Mapear ".concat(field.label)} className="h-10 w-full rounded-md border bg-background px-3" value={selected == null ? "" : String(selected)} onChange={function (event) {
                        var value = event.target.value;
                        setLegacyMapping(function (prev) {
                            var _a;
                            return (__assign(__assign({}, prev), (_a = {}, _a[field.key] = value === "" ? null : Number(value), _a)));
                        });
                    }}>
                    <option value="">{field.required ? "Selecione a coluna" : "Não usar"}</option>
                    {legacyCsv.headers.map(function (header, index) { return (<option key={"".concat(header, "-").concat(index)} value={String(index)}>
                        {header || "Coluna ".concat(index + 1)}
                      </option>); })}
                  </select>
                </div>);
            })}
            {!mappingValidation.hasAllRequired ? (<p className="text-sm text-destructive">Selecione todas as colunas obrigatórias.</p>) : null}
            {mappingValidation.hasAllRequired && !mappingValidation.uniqueRequired ? (<p className="text-sm text-destructive">Colunas obrigatórias não podem se repetir.</p>) : null}
          </card_1.CardContent>
        </card_1.Card>) : null}

      {showImportButton ? (<div className="flex justify-end">
          <button_1.Button onClick={function () { return importMutation.mutate(); }} disabled={importMutation.isPending} className="w-full sm:w-auto">
            {importMutation.isPending ? "Importando..." : "Importar e Salvar"}
          </button_1.Button>
        </div>) : null}

      {mode === "json_sync" && listJson.length > 0 ? (<card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="text-lg">Preview - Participantes ({listJson.length})</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="rounded-md border">
              <table_1.Table role="table">
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead scope="col">Nome</table_1.TableHead>
                    <table_1.TableHead scope="col">CPF</table_1.TableHead>
                    <table_1.TableHead scope="col">Ingresso</table_1.TableHead>
                    <table_1.TableHead scope="col">QR Code</table_1.TableHead>
                    <table_1.TableHead scope="col">Check-in</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {listJson.map(function (p) { return (<table_1.TableRow key={p.seatId}>
                      <table_1.TableCell>{p.participantName}</table_1.TableCell>
                      <table_1.TableCell className="font-mono text-xs">{p.cpf}</table_1.TableCell>
                      <table_1.TableCell>{p.ticketName}</table_1.TableCell>
                      <table_1.TableCell className="font-mono text-xs">{p.qrCode}</table_1.TableCell>
                      <table_1.TableCell>{p.checkinDone ? "Sim" : "Não"}</table_1.TableCell>
                    </table_1.TableRow>); })}
                </table_1.TableBody>
              </table_1.Table>
            </div>
          </card_1.CardContent>
        </card_1.Card>) : null}

      {mode === "legacy_csv" && legacyCsv != null && mappingValidation.valid ? (<card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle className="text-lg">Preview - Participantes legado ({mappedLegacyRows.length})</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-4">
            <div className="rounded-md border">
              <table_1.Table role="table">
                <table_1.TableHeader>
                  <table_1.TableRow>
                    <table_1.TableHead scope="col">Número</table_1.TableHead>
                    <table_1.TableHead scope="col">Nome Completo</table_1.TableHead>
                    <table_1.TableHead scope="col">Sexo</table_1.TableHead>
                    <table_1.TableHead scope="col">CPF</table_1.TableHead>
                    <table_1.TableHead scope="col">Data de Nascimento</table_1.TableHead>
                    <table_1.TableHead scope="col">Modalidade</table_1.TableHead>
                    <table_1.TableHead scope="col">Tamanho da Camisa</table_1.TableHead>
                    <table_1.TableHead scope="col">Equipe</table_1.TableHead>
                  </table_1.TableRow>
                </table_1.TableHeader>
                <table_1.TableBody>
                  {mappedLegacyRows.map(function (legacy, index) {
                return (<table_1.TableRow key={"".concat(legacy.cpf, "-").concat(index)}>
                        <table_1.TableCell>{legacy.number}</table_1.TableCell>
                        <table_1.TableCell>{legacy.fullName}</table_1.TableCell>
                        <table_1.TableCell>{legacy.sex || "-"}</table_1.TableCell>
                        <table_1.TableCell className="font-mono text-xs">{legacy.cpf}</table_1.TableCell>
                        <table_1.TableCell>{legacy.birthDate}</table_1.TableCell>
                        <table_1.TableCell>{legacy.modality || "-"}</table_1.TableCell>
                        <table_1.TableCell>{legacy.shirtSize || "-"}</table_1.TableCell>
                        <table_1.TableCell>{legacy.team || "-"}</table_1.TableCell>
                      </table_1.TableRow>);
            })}
                </table_1.TableBody>
              </table_1.Table>
            </div>
            {legacyImportResult ? (<p className="text-sm text-muted-foreground">
                Importados: {legacyImportResult.imported} | Erros: {legacyImportResult.errors.length}
              </p>) : null}
          </card_1.CardContent>
        </card_1.Card>) : null}
    </main>);
}
