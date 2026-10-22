import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  analyzeLogs,
  analyzeText,
  diffLines,
  DIFF_CELL_LIMIT,
  DIFF_LINE_LIMIT,
  executeRegex,
  extractIndicators,
  filterLinesByRegex,
  indicatorCategories,
  LOG_INPUT_LIMIT,
  REGEX_INPUT_LIMIT,
  REGEX_PATTERN_LIMIT,
  searchLiteral,
  TEXT_INPUT_LIMIT,
  transformText,
  type DiffLine,
  type IndicatorCategory,
  type IndicatorMatch,
  type LiteralMatch,
  type LogAnalysis,
  type RegexMatch,
  type TextMetrics,
  type TextTransform,
  type TransformOptions,
} from "../lib/textTools";

type TextTab = "metrics" | "transform" | "search" | "regex" | "compare" | "indicators" | "logs";

const tabs: Array<{ id: TextTab; label: string }> = [
  { id: "metrics", label: "Texto" },
  { id: "transform", label: "Transformar" },
  { id: "search", label: "Buscar" },
  { id: "regex", label: "Regex" },
  { id: "compare", label: "Comparar" },
  { id: "indicators", label: "Indicadores" },
  { id: "logs", label: "Logs" },
];

const transforms: Array<{ id: TextTransform; label: string; explanation?: string }> = [
  { id: "uppercase", label: "Convertir a mayúsculas" },
  { id: "lowercase", label: "Convertir a minúsculas" },
  { id: "trim", label: "Eliminar espacios exteriores", explanation: "Quita espacios en los extremos; no cambia los espacios internos." },
  { id: "normalize-newlines", label: "Normalizar saltos de línea", explanation: "Convierte CRLF y CR a LF; no cambia el contenido visible." },
  { id: "remove-blank-lines", label: "Eliminar líneas vacías", explanation: "También elimina líneas que solo contienen espacios o tabuladores." },
  { id: "unique-lines", label: "Eliminar líneas duplicadas", explanation: "Conserva la primera aparición exacta y el orden original." },
  { id: "sort-lines", label: "Ordenar líneas alfabéticamente", explanation: "Cambia el orden original de los registros." },
  { id: "reverse-lines", label: "Invertir orden de líneas", explanation: "Invierte el orden de todos los renglones." },
  { id: "number-lines", label: "Añadir numeración", explanation: "Añade números secuenciales; no conserva numeración previa." },
  { id: "remove-line-numbers", label: "Eliminar numeración inicial", explanation: "Elimina un número seguido de punto, dos puntos o guion al inicio." },
  { id: "prefix-suffix", label: "Añadir prefijo/sufijo por línea" },
  { id: "collapse-spaces", label: "Eliminar espacios repetidos", explanation: "Reduce grupos de espacios y tabuladores a un espacio; conserva saltos de línea." },
  { id: "tabs-to-spaces", label: "Convertir tabuladores a espacios" },
  { id: "spaces-to-tabs", label: "Convertir grupos de espacios a tabuladores" },
  { id: "include-lines", label: "Filtrar líneas que contienen texto" },
  { id: "exclude-lines", label: "Excluir líneas que contienen texto" },
  { id: "regex-lines", label: "Extraer líneas por Regex", explanation: "Filtra las líneas que coinciden sintácticamente con el patrón." },
  { id: "blank-between-lines", label: "Añadir línea en blanco entre líneas", explanation: "Inserta una línea vacía entre cada línea, no detecta límites semánticos de registros." },
  { id: "remove-blank-between-lines", label: "Quitar líneas en blanco", explanation: "Elimina todas las líneas vacías y las que contienen solo espacios." },
];

const regexExamples = [
  { label: "IPv4 (candidato)", pattern: String.raw`\b(?:\d{1,3}\.){3}\d{1,3}\b`, note: "Coincidencia sintáctica; no valida rangos octeto." },
  { label: "MAC", pattern: String.raw`\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b`, note: "Detecta una forma habitual de MAC." },
  { label: "URL HTTP(S)", pattern: String.raw`https?://[^\s<>"']+`, note: "Detecta URL con esquema HTTP(S), no comprueba disponibilidad." },
  { label: "Correo", pattern: String.raw`[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}`, note: "Candidato sintáctico, no valida que el correo exista." },
  { label: "Fecha común", pattern: String.raw`\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b`, note: "Detecta formatos de fecha comunes, no comprueba calendario." },
  { label: "Hexadecimal", pattern: String.raw`\b(?:0x)?[0-9A-Fa-f]+\b`, note: "Una cadena hexadecimal no identifica por sí sola un formato." },
  { label: "Código HTTP en log", pattern: String.raw`\b[1-5]\d{2}\b`, note: "Coincidencia numérica; el contexto determina si es estado HTTP." },
  { label: "error / failed / warning", pattern: String.raw`\b(?:error|failed|warning)\b`, note: "Busca palabras comunes, sin determinar la severidad real del evento." },
  { label: "Puerto en texto", pattern: String.raw`(?:port\s*[:=]?\s*|:\s*)(\d{1,5})\b`, note: "Extrae un candidato numérico; el patrón no valida el protocolo." },
  { label: "Timestamp", pattern: String.raw`\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b`, note: "Detecta estructura de fecha-hora, no interpreta su zona." },
];

const transformOptionsRequired = new Set<TextTransform>([
  "prefix-suffix", "include-lines", "exclude-lines", "regex-lines",
]);
const costlyTransforms = new Set<TextTransform>([
  "sort-lines", "unique-lines", "regex-lines", "include-lines", "exclude-lines",
]);

function copyText(value: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error("El portapapeles no está disponible en este contexto."));
  }
  return navigator.clipboard.writeText(value);
}

function downloadText(value: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="text-stat"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Highlighted({ before, match, after }: { before: string; match: string; after: string }) {
  return <>{before}<mark className="text-highlight">{match}</mark>{after}</>;
}

function literalContext(match: LiteralMatch): ReactNode {
  return <Highlighted before={match.contextBefore} match={match.value} after={match.contextAfter} />;
}

function reportForDiff(result: DiffLine[]): string {
  return result.map((line) => {
    if (line.type === "modified") return `~ L${line.leftLine} → L${line.rightLine}\t${line.value}\t=>\t${line.otherValue ?? ""}`;
    const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";
    const lineNumber = line.type === "added" ? line.rightLine : line.leftLine;
    return `${prefix} L${lineNumber ?? "-"}\t${line.value}`;
  }).join("\n");
}

function formatMetrics(metrics: TextMetrics) {
  return [
    ["Unidades UTF-16", metrics.utf16Units],
    ["Puntos de código", metrics.codePoints],
    ["Grafemas", metrics.graphemes ?? "API no disponible"],
    ["Caracteres sin espacios", metrics.charactersWithoutWhitespace],
    ["Palabras", metrics.words],
    ["Líneas", metrics.lines],
    ["Líneas vacías", metrics.blankLines],
    ["Párrafos aprox.", metrics.paragraphs],
    ["Bytes UTF-8", metrics.utf8Bytes],
    ["Caracteres numéricos", metrics.numericCharacters],
    ["Letras", metrics.letters],
    ["Espacios / whitespace", metrics.whitespaceCharacters],
    ["No imprimibles detectables", metrics.detectableNonPrintable],
  ] as const;
}

export function TextRegexSection() {
  const [tab, setTab] = useState<TextTab>("metrics");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [selectedTransform, setSelectedTransform] = useState<TextTransform>("uppercase");
  const [transformBusy, setTransformBusy] = useState(false);
  const [transformOptions, setTransformOptions] = useState<TransformOptions>({
    spacesPerTab: 4,
    flags: "i",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchWholeWord, setSearchWholeWord] = useState(false);
  const [searchResults, setSearchResults] = useState<LiteralMatch[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [regexPattern, setRegexPattern] = useState("");
  const [regexText, setRegexText] = useState("");
  const [regexFlags, setRegexFlags] = useState({ g: true, i: false, m: false, s: false, u: true });
  const [regexResults, setRegexResults] = useState<RegexMatch[]>([]);
  const [regexError, setRegexError] = useState("");
  const [regexBusy, setRegexBusy] = useState(false);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [diffResults, setDiffResults] = useState<DiffLine[]>([]);
  const [diffError, setDiffError] = useState("");
  const [indicatorSelection, setIndicatorSelection] = useState<IndicatorCategory[]>(indicatorCategories.map((category) => category.id));
  const [deduplicateIndicators, setDeduplicateIndicators] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorMatch[]>([]);
  const [indicatorRan, setIndicatorRan] = useState(false);
  const [logsText, setLogsText] = useState("");
  const [logTerms, setLogTerms] = useState("error, failed, warning");
  const [logContext, setLogContext] = useState(1);
  const [logAnalysis, setLogAnalysis] = useState<LogAnalysis | null>(null);
  const [logError, setLogError] = useState("");
  const [logFileName, setLogFileName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const metrics = useMemo(() => analyzeText(text), [text]);
  const chosenTransform = transforms.find((item) => item.id === selectedTransform);
  const flagsString = ["g", "i", "m", "s", "u"].filter((flag) => regexFlags[flag as keyof typeof regexFlags]).join("");

  function updateText(value: string) {
    if (value.length > TEXT_INPUT_LIMIT) {
      setError(`La entrada supera el límite de ${TEXT_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16.`);
      return;
    }
    setText(value);
    setError("");
  }

  async function copyResult(value: string, label: string) {
    try {
      await copyText(value);
      setMessage(`${label} copiado.`);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo copiar el resultado.");
    }
  }

  async function runTransform() {
    setError("");
    setMessage("");
    setTransformBusy(true);
    try {
      const transformed = selectedTransform === "regex-lines"
        ? await filterLinesByRegex(text, transformOptions.pattern ?? "", transformOptions.flags ?? "")
        : transformText(selectedTransform, text, transformOptions);
      setOutput(transformed);
      setMessage("Transformación aplicada localmente.");
    } catch (reason) {
      setOutput("");
      setError(reason instanceof Error ? reason.message : "No se pudo transformar el texto.");
    } finally {
      setTransformBusy(false);
    }
  }

  function runSearch() {
    setError("");
    setMessage("");
    try {
      const found = searchLiteral(text, searchQuery, {
        caseSensitive: searchCaseSensitive,
        wholeWord: searchWholeWord,
      });
      setSearchResults(found);
      setSearchIndex(0);
      setMessage(`${found.length} coincidencia${found.length === 1 ? "" : "s"} encontrada${found.length === 1 ? "" : "s"}.`);
    } catch (reason) {
      setSearchResults([]);
      setError(reason instanceof Error ? reason.message : "No se pudo buscar.");
    }
  }

  async function runRegex() {
    setRegexError("");
    setRegexResults([]);
    setRegexBusy(true);
    try {
      const results = await executeRegex(regexText, regexPattern, flagsString);
      setRegexResults(results);
      setMessage(`${results.length} coincidencia${results.length === 1 ? "" : "s"} Regex.`);
    } catch (reason) {
      setRegexError(reason instanceof Error ? reason.message : "No se pudo ejecutar la expresión regular.");
    } finally {
      setRegexBusy(false);
    }
  }

  function runDiff() {
    setDiffError("");
    try {
      setDiffResults(diffLines(leftText, rightText, {
        ignoreOuterWhitespace: ignoreWhitespace,
        ignoreCase,
      }));
    } catch (reason) {
      setDiffResults([]);
      setDiffError(reason instanceof Error ? reason.message : "No se pudieron comparar los textos.");
    }
  }

  function runIndicators() {
    setError("");
    setMessage("");
    try {
      setIndicators(extractIndicators(text, indicatorSelection, deduplicateIndicators));
      setIndicatorRan(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron extraer indicadores.");
      setIndicatorRan(false);
    }
  }

  function runLogs() {
    setLogError("");
    try {
      setLogAnalysis(analyzeLogs(logsText, logTerms, logContext));
    } catch (reason) {
      setLogAnalysis(null);
      setLogError(reason instanceof Error ? reason.message : "No se pudo analizar el log.");
    }
  }

  async function loadLogFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > LOG_INPUT_LIMIT * 4) {
      setLogError(`El archivo supera el límite aproximado de ${(LOG_INPUT_LIMIT * 4 / 1_000_000).toFixed(0)} MB.`);
      return;
    }
    try {
      const contents = await file.text();
      if (contents.length > LOG_INPUT_LIMIT) {
        setLogError(`El texto del archivo supera el límite de ${LOG_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16.`);
        return;
      }
      setLogsText(contents);
      setLogFileName(file.name);
      setLogAnalysis(null);
      setLogError("");
    } catch (reason) {
      setLogError(reason instanceof Error ? reason.message : "No se pudo leer el archivo local.");
    }
  }

  function renderSearchResults() {
    if (!searchResults.length) {
      return <div className="empty-state compact-empty"><span>⌕</span><p>Ejecuta una búsqueda para mostrar coincidencias.</p></div>;
    }
    return (
      <div className="search-result-view">
        <div className="search-navigation">
          <span>{searchIndex + 1} / {searchResults.length}</span>
          <button type="button" className="icon-button" onClick={() => setSearchIndex((index) => (index - 1 + searchResults.length) % searchResults.length)} aria-label="Coincidencia anterior">↑</button>
          <button type="button" className="icon-button" onClick={() => setSearchIndex((index) => (index + 1) % searchResults.length)} aria-label="Coincidencia siguiente">↓</button>
        </div>
        <ol className="text-results-list">
          {searchResults.map((match, index) => (
            <li className={`text-result-item ${index === searchIndex ? "selected" : ""}`} key={`${match.start}-${index}`} onClick={() => setSearchIndex(index)}>
              <span className="result-position">L{match.line} · col {match.column} · offset {match.start}</span>
              <div className="result-context">{literalContext(match)}</div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <section className="page-view tool-page lab-page text-lab-page">
      <div className="page-title-row">
        <div><div className="eyebrow"><span className="eyebrow-line" /> TEXT / REGEX / LOCAL ANALYSIS</div><h1>Text &amp; Regex <span>lab.</span></h1><p className="page-description">Procesa texto y logs localmente. Entrada limitada a {TEXT_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16.</p></div>
        <span className="tool-status"><span /> SIN PERSISTENCIA</span>
      </div>

      <div className="text-workspace">
        <nav className="text-tabs" role="tablist" aria-label="Herramientas de texto">
          {tabs.map((item) => (
            <button type="button" role="tab" aria-selected={tab === item.id} className={`text-tab ${tab === item.id ? "active" : ""}`} key={item.id} onClick={() => { setTab(item.id); setError(""); }}>
              {item.label}
            </button>
          ))}
        </nav>

        {tab !== "logs" && (
          <section className="panel text-input-panel">
            <div className="panel-heading text-input-heading">
              <div><span className="panel-kicker">INPUT / IN-MEMORY</span><h2>Texto de trabajo</h2></div>
              <span className={`live-counter ${text.length >= TEXT_INPUT_LIMIT * 0.9 ? "counter-warning" : ""}`}>{text.length.toLocaleString("es-ES")} / {TEXT_INPUT_LIMIT.toLocaleString("es-ES")}</span>
            </div>
            <label className="visually-hidden" htmlFor="text-workbench-input">Texto de trabajo</label>
            <textarea id="text-workbench-input" className="field-input text-main-input" value={text} onChange={(event) => updateText(event.target.value)} placeholder="Pega o escribe texto, registros o datos de prueba…" spellCheck={false} />
            <div className="text-input-footer"><span>Procesamiento local · No se guarda en almacenamiento persistente</span><button type="button" className="text-button" onClick={() => { setText(""); setOutput(""); setSearchResults([]); setIndicators([]); setIndicatorRan(false); setMessage(""); setError(""); }}>LIMPIAR ENTRADA</button></div>
            {error && <p className="error-message" role="alert">{error}</p>}
          </section>
        )}

        {tab === "metrics" && (
          <div className="text-section-content">
            <div className="text-stats-grid">
              {formatMetrics(metrics).map(([label, value]) => (
                <Stat key={label} label={label} value={value} detail={
                  label === "Unidades UTF-16" ? "Unidades internas de JavaScript" :
                  label === "Puntos de código" ? "Valores Unicode; un emoji puede usar varios" :
                  label === "Grafemas" ? "Caracteres percibidos; requiere Intl.Segmenter" :
                  label === "Caracteres sin espacios" ? "Puntos de código que no son whitespace" :
                  label === "Líneas" ? "Renglones separados por CRLF, CR o LF" :
                  label === "Líneas vacías" ? "Vacías o con whitespace únicamente" :
                  label === "Párrafos aprox." ? "Bloques separados por línea en blanco" :
                  label === "Bytes UTF-8" ? "Bytes codificados con TextEncoder" :
                  label === "No imprimibles detectables" ? "Categorías Unicode control/formato/privado/no asignado" :
                  label === "Espacios / whitespace" ? "Puntos Unicode reconocidos por \\s" : "Conteo de puntos de código Unicode"
                } />
              ))}
            </div>
            <p className="notice">“Caracteres” puede significar unidades UTF-16, puntos de código o grafemas visibles; aquí se muestran por separado. Letras y números usan categorías Unicode. Las métricas se actualizan al editar (entrada limitada).</p>
          </div>
        )}

        {tab === "transform" && (
          <div className="text-section-content">
            <div className="panel tool-subpanel">
              <div className="panel-heading"><div><span className="panel-kicker">TRANSFORM / ON DEMAND</span><h2>Operación</h2></div><span className="tool-status">LOCAL</span></div>
              <div className="text-transform-controls">
                <label className="field-label" htmlFor="text-transform-select">Transformación</label>
                <select id="text-transform-select" className="field-input" value={selectedTransform} onChange={(event) => {
                  const selected = transforms.find((item) => item.id === event.target.value);
                  if (selected) setSelectedTransform(selected.id);
                }}>
                  {transforms.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
                </select>
                {(selectedTransform === "include-lines" || selectedTransform === "exclude-lines") && <input className="field-input" value={transformOptions.keyword ?? ""} onChange={(event) => setTransformOptions((options) => ({ ...options, keyword: event.target.value }))} placeholder="Cadena a buscar en líneas" aria-label="Cadena de filtro" />}
                {selectedTransform === "regex-lines" && <div className="inline-params"><input className="field-input" value={transformOptions.pattern ?? ""} onChange={(event) => setTransformOptions((options) => ({ ...options, pattern: event.target.value }))} placeholder="Patrón Regex" aria-label="Patrón Regex de filtro" /><input className="field-input small-field" value={transformOptions.flags ?? "i"} onChange={(event) => setTransformOptions((options) => ({ ...options, flags: event.target.value }))} aria-label="Flags Regex" /></div>}
                {selectedTransform === "prefix-suffix" && <div className="inline-params"><input className="field-input" value={transformOptions.prefix ?? ""} onChange={(event) => setTransformOptions((options) => ({ ...options, prefix: event.target.value }))} placeholder="Prefijo" aria-label="Prefijo por línea" /><input className="field-input" value={transformOptions.suffix ?? ""} onChange={(event) => setTransformOptions((options) => ({ ...options, suffix: event.target.value }))} placeholder="Sufijo" aria-label="Sufijo por línea" /></div>}
                {(selectedTransform === "tabs-to-spaces" || selectedTransform === "spaces-to-tabs") && <label className="field-label">Espacios por tabulador <input className="field-input small-field inline-number" type="number" min={1} max={16} value={transformOptions.spacesPerTab ?? 4} onChange={(event) => setTransformOptions((options) => ({ ...options, spacesPerTab: Number(event.target.value) }))} /></label>}
                {chosenTransform?.explanation && <p className="notice">{chosenTransform.explanation}</p>}
                {transformOptionsRequired.has(selectedTransform) && !transformOptions.keyword && !transformOptions.pattern && selectedTransform !== "prefix-suffix" && <p className="microcopy">Esta operación requiere parámetros antes de ejecutarse.</p>}
                <button type="button" className="primary-button" onClick={() => void runTransform()} disabled={transformBusy}>{transformBusy ? "Procesando…" : "Ejecutar transformación"}</button>
                {costlyTransforms.has(selectedTransform) && <p className="microcopy">Se ejecuta bajo petición. El tamaño máximo general sigue siendo {TEXT_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16.</p>}
                {message && <p className="status-message status-success" role="status">{message}</p>}
              </div>
              <div className="panel-divider" />
              <div className="panel-heading compact-heading"><div><span className="panel-kicker">OUTPUT</span><h2>Resultado</h2></div></div>
              <textarea className="field-input text-output" value={output} readOnly placeholder="La salida transformada aparece aquí…" />
              <div className="action-row"><button type="button" className="secondary-button" disabled={!output} onClick={() => void copyResult(output, "Resultado")}>Copiar</button><button type="button" className="secondary-button" disabled={!output} onClick={() => downloadText(output, "smartin-text-output.txt")}>Descargar .txt</button></div>
            </div>
          </div>
        )}

        {tab === "search" && (
          <div className="text-section-content">
            <div className="panel tool-subpanel">
              <div className="panel-heading"><div><span className="panel-kicker">SEARCH / LITERAL</span><h2>Buscar en el texto original</h2></div><span className="result-count">{searchResults.length} resultados</span></div>
              <div className="inline-params">
                <input className="field-input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }} placeholder="Término literal…" aria-label="Término de búsqueda" />
                <button type="button" className="primary-button" onClick={runSearch}>Buscar</button>
              </div>
              <div className="choice-row">
                <label className="check-choice"><input type="checkbox" checked={searchCaseSensitive} onChange={(event) => setSearchCaseSensitive(event.target.checked)} /> Distinguir mayúsculas</label>
                <label className="check-choice"><input type="checkbox" checked={searchWholeWord} onChange={(event) => setSearchWholeWord(event.target.checked)} /> Palabras completas</label>
              </div>
              {message && <p className="status-message status-success" role="status">{message}</p>}
              {renderSearchResults()}
              {searchResults.length > 0 && <div className="action-row"><button type="button" className="secondary-button" onClick={() => void copyResult(searchResults.map((item) => `L${item.line}:${item.column} [${item.start}-${item.end}] ${item.value}`).join("\n"), "Resultados")}>Copiar coincidencias</button></div>}
              <p className="microcopy">Posiciones y offsets se cuentan en unidades UTF-16 de JavaScript; columnas y líneas son 1-based sobre la entrada original.</p>
            </div>
          </div>
        )}

        {tab === "regex" && (
          <div className="text-section-content">
            <div className="panel tool-subpanel">
              <div className="panel-heading"><div><span className="panel-kicker">REGEX / ISOLATED WORKER</span><h2>Banco de expresiones</h2></div><span className="result-count">{regexResults.length} coincidencias</span></div>
              <label className="field-label" htmlFor="regex-pattern">Expresión regular</label>
              <div className="inline-params"><input id="regex-pattern" className="field-input mono-input" value={regexPattern} onChange={(event) => setRegexPattern(event.target.value)} maxLength={REGEX_PATTERN_LIMIT} placeholder="Escribe el patrón sin delimitadores" /><span className="live-counter">{regexPattern.length}/{REGEX_PATTERN_LIMIT}</span></div>
              <div className="regex-examples">
                <label className="field-label" htmlFor="regex-examples">Ejemplos (editables)</label>
                <select id="regex-examples" className="field-input" value="" onChange={(event) => {
                  const example = regexExamples.find((item) => item.label === event.target.value);
                  if (example) setRegexPattern(example.pattern);
                }}>
                  <option value="">Selecciona un ejemplo…</option>
                  {regexExamples.map((example) => <option value={example.label} key={example.label}>{example.label}</option>)}
                </select>
                <p className="microcopy">{regexExamples.find((item) => item.pattern === regexPattern)?.note ?? "Los ejemplos detectan candidatos sintácticos y no son validadores universales."}</p>
              </div>
              <div className="regex-flags" aria-label="Flags de expresión regular">
                {(["g", "i", "m", "s", "u"] as const).map((flag) => <label className="check-choice" key={flag}><input type="checkbox" checked={regexFlags[flag]} onChange={(event) => setRegexFlags((current) => ({ ...current, [flag]: event.target.checked }))} /> <code>{flag}</code></label>)}
              </div>
              <label className="field-label" htmlFor="regex-test-text">Texto de prueba (máximo {REGEX_INPUT_LIMIT.toLocaleString("es-ES")} unidades UTF-16)</label>
              <textarea id="regex-test-text" className="field-input text-output" value={regexText} maxLength={REGEX_INPUT_LIMIT} onChange={(event) => setRegexText(event.target.value)} placeholder="Pega un fragmento acotado de texto…" />
              <div className="text-input-footer"><button type="button" className="text-button" onClick={() => setRegexText(text.slice(0, REGEX_INPUT_LIMIT))}>USAR TEXTO PRINCIPAL</button><span>{regexText.length.toLocaleString("es-ES")} / {REGEX_INPUT_LIMIT.toLocaleString("es-ES")}</span></div>
              <button type="button" className="primary-button" onClick={() => void runRegex()} disabled={regexBusy}>{regexBusy ? "Analizando…" : "Ejecutar Regex"}</button>
              {regexError && <p className="error-message" role="alert">{regexError}</p>}
              <p className="notice notice-warning">La ejecución se aísla en un Web Worker y se cancela al superar 500 ms. Los límites de entrada/patrón reducen riesgo, pero JavaScript no puede garantizar que una expresión sea inmune a ReDoS. Evita patrones complejos y entradas no confiables.</p>
              <div className="regex-results">
                {regexResults.map((match, index) => <div className="regex-result" key={`${match.start}-${index}`}><div className="result-position">#{index + 1} · L{match.line}:C{match.column} · [{match.start}, {match.end})</div><code>{match.value || "(coincidencia vacía)"}</code>{match.groups.length > 0 && <div className="capture-list">{match.groups.map((group, groupIndex) => <span key={groupIndex}>Grupo {groupIndex + 1}: <code>{group ?? "(sin captura)"}</code></span>)}</div>}</div>)}
              </div>
              {regexResults.length > 0 && <button type="button" className="secondary-button" onClick={() => void copyResult(JSON.stringify(regexResults, null, 2), "Resultados Regex")}>Copiar resultados Regex</button>}
            </div>
          </div>
        )}

        {tab === "compare" && (
          <div className="text-section-content">
            <div className="panel tool-subpanel">
              <div className="panel-heading"><div><span className="panel-kicker">DIFF / LCS</span><h2>Comparación línea por línea</h2></div><span className="result-count">{diffResults.filter((line) => line.type !== "same").length} diferencias</span></div>
              <div className="compare-text-grid">
                <label className="encoding-pane"><span className="pane-heading">TEXTO A</span><textarea className="field-input text-output" value={leftText} maxLength={TEXT_INPUT_LIMIT} onChange={(event) => setLeftText(event.target.value)} placeholder="Versión original…" /></label>
                <label className="encoding-pane"><span className="pane-heading">TEXTO B</span><textarea className="field-input text-output" value={rightText} maxLength={TEXT_INPUT_LIMIT} onChange={(event) => setRightText(event.target.value)} placeholder="Versión modificada…" /></label>
              </div>
              <div className="choice-row">
                <label className="check-choice"><input type="checkbox" checked={ignoreWhitespace} onChange={(event) => setIgnoreWhitespace(event.target.checked)} /> Ignorar espacios exteriores</label>
                <label className="check-choice"><input type="checkbox" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} /> Ignorar mayúsculas</label>
              </div>
              <div className="action-row"><button type="button" className="primary-button" onClick={runDiff}>Comparar textos</button><button type="button" className="secondary-button" disabled={!diffResults.length} onClick={() => void copyResult(reportForDiff(diffResults), "Informe")}>Copiar informe</button><button type="button" className="secondary-button" disabled={!diffResults.length} onClick={() => downloadText(reportForDiff(diffResults), "smartin-text-diff.txt")}>Descargar informe</button></div>
              {diffError && <p className="error-message" role="alert">{diffError}</p>}
              <div className="diff-results">
                {diffResults.map((line, index) => <div className={`diff-line diff-${line.type}`} key={`${line.type}-${line.leftLine}-${line.rightLine}-${index}`}><span>{line.type === "added" ? "+" : line.type === "removed" ? "−" : line.type === "modified" ? "~" : " "}</span><span>{line.leftLine ?? "—"}</span><span>{line.rightLine ?? "—"}</span><code>{line.type === "modified" ? `${line.value}  →  ${line.otherValue}` : line.value}</code></div>)}
              </div>
              <p className="microcopy">LCS limitado a {TEXT_INPUT_LIMIT.toLocaleString("es-ES")} unidades, {DIFF_LINE_LIMIT} líneas y {(DIFF_CELL_LIMIT).toLocaleString("es-ES")} celdas. “Modificada” solo se asigna a una única línea sustituida entre anclas comunes.</p>
            </div>
          </div>
        )}

        {tab === "indicators" && (
          <div className="text-section-content">
            <div className="panel tool-subpanel">
              <div className="panel-heading"><div><span className="panel-kicker">IOC / SYNTAX ONLY</span><h2>Extraer indicadores</h2></div><span className="result-count">{indicators.length} resultados</span></div>
              <div className="indicator-options">
                {indicatorCategories.map((category) => <label className="check-choice" key={category.id}><input type="checkbox" checked={indicatorSelection.includes(category.id)} onChange={(event) => setIndicatorSelection((current) => event.target.checked ? [...current, category.id] : current.filter((item) => item !== category.id))} /> {category.label}</label>)}
              </div>
              <div className="action-row"><label className="check-choice"><input type="checkbox" checked={deduplicateIndicators} onChange={(event) => setDeduplicateIndicators(event.target.checked)} /> Eliminar duplicados por categoría</label><button type="button" className="primary-button" onClick={runIndicators}>Extraer</button><button type="button" className="secondary-button" disabled={!indicators.length} onClick={() => void copyResult(indicators.map((item) => `${item.category}\t${item.value}\t@${item.position}`).join("\n"), "Indicadores")}>Copiar</button></div>
              {message && <p className="status-message status-success" role="status">{message}</p>}
              {indicatorRan && indicators.length === 0 && <div className="empty-state compact-empty"><span>⌕</span><p>No se encontraron coincidencias con las categorías seleccionadas.</p></div>}
              <div className="indicator-results">
                {indicators.map((item, index) => <div className="indicator-row" key={`${item.category}-${item.position}-${index}`}><span className="indicator-category">{item.category}</span><code>{item.value}</code><small>posición {item.position} · coincidencia sintáctica</small></div>)}
              </div>
              <p className="notice notice-warning">Las extracciones son coincidencias sintácticas locales. No se consulta la red, no se confirma que existan dominios ni se verifica un hash o servicio.</p>
            </div>
          </div>
        )}

        {tab === "logs" && (
          <div className="text-section-content">
            <div className="panel tool-subpanel">
              <div className="panel-heading"><div><span className="panel-kicker">LOGS / LOCAL ONLY</span><h2>Analizador de registros</h2></div><span className="live-counter">{logsText.length.toLocaleString("es-ES")} / {LOG_INPUT_LIMIT.toLocaleString("es-ES")}</span></div>
              <label className="field-label" htmlFor="log-file">Leer archivo de texto local (máximo 4 MB)</label>
              <input id="log-file" className="field-input file-input" type="file" accept=".txt,.log,text/plain" onChange={(event) => void loadLogFile(event)} />
              {logFileName && <p className="microcopy">Archivo cargado en memoria: {logFileName}</p>}
              <label className="field-label" htmlFor="logs-text">Log de entrada</label>
              <textarea id="logs-text" className="field-input text-output log-input" value={logsText} maxLength={LOG_INPUT_LIMIT} onChange={(event) => { setLogsText(event.target.value); setLogAnalysis(null); }} placeholder="Pega logs o abre un archivo local…" />
              <div className="log-filter-grid">
                <label className="encoding-pane"><span className="pane-heading">TÉRMINOS (SEPARADOS POR COMAS)</span><input className="field-input" value={logTerms} onChange={(event) => setLogTerms(event.target.value)} placeholder="error, failed, warning" /></label>
                <label className="encoding-pane"><span className="pane-heading">CONTEXTO (LÍNEAS)</span><input className="field-input small-field" type="number" min={0} max={10} value={logContext} onChange={(event) => setLogContext(Number(event.target.value))} /></label>
              </div>
              <div className="action-row"><button type="button" className="primary-button" onClick={runLogs}>Analizar logs</button><button type="button" className="secondary-button" onClick={() => { setLogsText(""); setLogAnalysis(null); setLogError(""); setLogFileName(""); }}>Limpiar análisis</button>{logAnalysis && <button type="button" className="secondary-button" onClick={() => downloadText(formatLogAnalysis(logAnalysis), "smartin-log-analysis.txt")}>Exportar resultados</button>}</div>
              {logError && <p className="error-message" role="alert">{logError}</p>}
              {logAnalysis && (
                <div className="log-results">
                  <div className="log-summary"><strong>{logAnalysis.matchedLineCount}</strong><span>líneas coincidentes de {logAnalysis.totalLines}</span></div>
                  {logAnalysis.terms.map(({ term, matches }) => <section className="log-term-group" key={term}><div className="panel-heading compact-heading"><h3>{term}</h3><span className="result-count">{matches.length} coincidencias</span></div>{matches.length ? matches.map((match) => <div className="log-match" key={`${term}-${match.lineNumber}`}>{match.contextBefore.map((line) => <div className="log-context-line" key={`before-${line.lineNumber}`}><span>{line.lineNumber}</span><code>{line.text}</code></div>)}<div className="log-context-line matched"><span>{match.lineNumber}</span><code>{match.text}</code></div>{match.contextAfter.map((line) => <div className="log-context-line" key={`after-${line.lineNumber}`}><span>{line.lineNumber}</span><code>{line.text}</code></div>)}</div>) : <p className="microcopy">Sin líneas para este término.</p>}</section>)}
                  <button type="button" className="secondary-button" onClick={() => void copyResult(formatLogAnalysis(logAnalysis), "Análisis de logs")}>Copiar informe</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatLogAnalysis(analysis: LogAnalysis): string {
  const output = [`Líneas coincidentes: ${analysis.matchedLineCount} / ${analysis.totalLines}`];
  for (const group of analysis.terms) {
    output.push("", `TÉRMINO: ${group.term} (${group.matches.length})`);
    for (const match of group.matches) {
      for (const context of match.contextBefore) output.push(`  ${context.lineNumber}: ${context.text}`);
      output.push(`> ${match.lineNumber}: ${match.text}`);
      for (const context of match.contextAfter) output.push(`  ${context.lineNumber}: ${context.text}`);
    }
  }
  return output.join("\n");
}
