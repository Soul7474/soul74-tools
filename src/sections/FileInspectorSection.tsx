import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { digestFile } from "../lib/hash";
import { copyToClipboard } from "../lib/feedback";
import { SectionHeader } from "../components/SectionHeader";
import {
  buildInspectionReport,
  detectCsvDelimiter,
  extractAsciiStringsFromBlob,
  fileExtension,
  formatFileSize,
  HEX_VIEW_BYTES,
  hexDump,
  inspectSignature,
  MAX_FILE_OPERATION_SIZE,
  MAX_SEARCH_RESULTS,
  MAX_STRING_RESULTS,
  MAX_TEXT_FILE_SIZE,
  parseCsv,
  parseHexPattern,
  searchFileBytes,
  type CsvParseResult,
  type SignatureInspection,
} from "../lib/fileInspector";

type StructuredJson = { rootType: string; formatted: string; keys: string[]; error: string };
type ExtractedString = { offset: number; value: string };

const rowOptions = [8, 16, 24, 32];

function jsonRootType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value === "object" ? "objeto" : typeof value === "string" ? "cadena" : typeof value === "number" ? "número" : "booleano";
}

function csvSeparator(label: string): string {
  return label === "Tab" ? "\t" : label;
}

export function FileInspectorSection() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [signature, setSignature] = useState<SignatureInspection | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState("Selecciona un archivo para iniciar.");
  const [operationStatus, setOperationStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancellableTask, setCancellableTask] = useState<"search" | "strings" | null>(null);
  const [hexOffset, setHexOffset] = useState("0");
  const [bytesPerRow, setBytesPerRow] = useState(16);
  const [hexView, setHexView] = useState("");
  const [loadedHexRange, setLoadedHexRange] = useState<{ offset: number; length: number } | null>(null);
  const [searchKind, setSearchKind] = useState<"hex" | "text">("hex");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOffsets, setSearchOffsets] = useState<number[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [stringMinimum, setStringMinimum] = useState(4);
  const [stringFilter, setStringFilter] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [strings, setStrings] = useState<ExtractedString[]>([]);
  const [jsonResult, setJsonResult] = useState<StructuredJson | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvSeparatorChoice, setCsvSeparatorChoice] = useState("AUTO");
  const [csvResult, setCsvResult] = useState<CsvParseResult | null>(null);
  const [sha256, setSha256] = useState("");
  const [observations, setObservations] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const operationVersionRef = useRef(0);
  const selectedDelimiter = useMemo(() => {
    if (csvSeparatorChoice !== "AUTO") return csvSeparator(csvSeparatorChoice);
    return csvText === null ? "," : detectCsvDelimiter(csvText).delimiter;
  }, [csvSeparatorChoice, csvText]);
  const csvDetection = useMemo(
    () => csvText === null ? null : detectCsvDelimiter(csvText),
    [csvText],
  );

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    abortRef.current?.abort();
    setSignature(null);
    setHexView("");
    setLoadedHexRange(null);
    setHexOffset("0");
    setSearchOffsets([]);
    setSearchIndex(0);
    setStrings([]);
    setJsonResult(null);
    setCsvText(null);
    setCsvResult(null);
    setSha256("");
    setOperationStatus("");
    setAnalysisStatus("Leyendo metadatos y cabecera localmente…");

    void (async () => {
      try {
        const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
        if (cancelled) return;
        setSignature(inspectSignature(bytes));
        const firstPage = new Uint8Array(await file.slice(0, HEX_VIEW_BYTES).arrayBuffer());
        if (cancelled) return;
        setHexView(hexDump(firstPage, 0, bytesPerRow));
        setLoadedHexRange({ offset: 0, length: firstPage.length });

        const extension = fileExtension(file.name);
        if (extension === "json" || file.type === "application/json" || file.type.endsWith("+json")) {
          if (file.size > MAX_TEXT_FILE_SIZE) {
            setJsonResult({ rootType: "", formatted: "", keys: [], error: "El análisis JSON está limitado a 5 MiB." });
          } else {
            try {
              const value: unknown = JSON.parse(await file.text());
              if (cancelled) return;
              setJsonResult({
                rootType: jsonRootType(value),
                formatted: JSON.stringify(value, null, 2),
                keys: value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
                error: "",
              });
            } catch (reason) {
              if (cancelled) return;
              setJsonResult({
                rootType: "",
                formatted: "",
                keys: [],
                error: reason instanceof Error ? reason.message : "El archivo no contiene JSON válido.",
              });
            }
          }
        }
        if (extension === "csv" || file.type === "text/csv") {
          if (file.size > MAX_TEXT_FILE_SIZE) {
            setCsvResult({ headers: [], rows: [], dataRowCount: 0, errors: ["El análisis CSV está limitado a 5 MiB."], truncated: false });
          } else {
            const text = await file.text();
            if (cancelled) return;
            setCsvText(text);
            setCsvSeparatorChoice("AUTO");
          }
        }
        if (!cancelled) setAnalysisStatus("Metadatos y vista inicial listos; todo el análisis se ejecuta en el navegador.");
      } catch (reason) {
        if (!cancelled) setAnalysisStatus(reason instanceof Error ? reason.message : "No se pudo leer el archivo.");
      }
    })();

    return () => {
      cancelled = true;
      operationVersionRef.current += 1;
      abortRef.current?.abort();
    };
  }, [file]);

  useEffect(() => {
    if (csvText === null) return;
    try {
      setCsvResult(parseCsv(csvText, selectedDelimiter));
    } catch (reason) {
      setCsvResult({ headers: [], rows: [], dataRowCount: 0, errors: [reason instanceof Error ? reason.message : "No se pudo analizar el CSV."], truncated: false });
    }
  }, [csvText, selectedDelimiter]);

  async function loadHexRange(source: File, requestedOffset: string, rowSize: number) {
    const parsedOffset = Number(requestedOffset);
    if (!Number.isSafeInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > source.size) {
      setOperationStatus("El offset debe ser un número de bytes entre 0 y el tamaño del archivo.");
      return;
    }
    const length = Math.min(HEX_VIEW_BYTES, source.size - parsedOffset);
    try {
      const bytes = new Uint8Array(await source.slice(parsedOffset, parsedOffset + length).arrayBuffer());
      setHexView(hexDump(bytes, parsedOffset, rowSize));
      setLoadedHexRange({ offset: parsedOffset, length: bytes.length });
      setOperationStatus(`Vista hexadecimal: ${bytes.length.toLocaleString("es-ES")} bytes desde el offset ${parsedOffset}.`);
    } catch (reason) {
      setOperationStatus(reason instanceof Error ? reason.message : "No se pudo leer ese rango.");
    }
  }

  function chooseFile(selected: File | null) {
    operationVersionRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setCancellableTask(null);
    setSignature(null);
    setHexView("");
    setLoadedHexRange(null);
    setHexOffset("0");
    setSearchQuery("");
    setSearchOffsets([]);
    setSearchIndex(0);
    setStrings([]);
    setJsonResult(null);
    setCsvText(null);
    setCsvResult(null);
    setCsvSeparatorChoice("AUTO");
    setSha256("");
    setObservations("");
    setOperationStatus("");
    setAnalysisStatus(selected ? "Leyendo metadatos y cabecera localmente…" : "Selecciona un archivo para iniciar.");
    setFile(selected);
    setCopyStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0] ?? null);
  }

  async function runSearch() {
    if (!file) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const operationVersion = operationVersionRef.current;
    setBusy(true);
    setCancellableTask("search");
    setOperationStatus("Buscando secuencia de bytes en el archivo local…");
    setSearchOffsets([]);
    setSearchIndex(0);
    try {
      const pattern = searchKind === "hex"
        ? parseHexPattern(searchQuery)
        : new TextEncoder().encode(searchQuery);
      if (pattern.length > 1024) throw new Error("La búsqueda está limitada a patrones de 1024 bytes.");
      const offsets = await searchFileBytes(file, pattern, controller.signal);
      if (operationVersionRef.current !== operationVersion) return;
      setSearchOffsets(offsets);
      setOperationStatus(offsets.length
        ? `${offsets.length}${offsets.length === MAX_SEARCH_RESULTS ? " o más" : ""} coincidencia(s); máximo mostrado: ${MAX_SEARCH_RESULTS}.`
        : "No se encontraron coincidencias.");
    } catch (reason) {
      if (operationVersionRef.current === operationVersion) {
        setOperationStatus(reason instanceof DOMException && reason.name === "AbortError"
          ? "Búsqueda cancelada."
          : reason instanceof Error ? reason.message : "No se pudo completar la búsqueda.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
        setCancellableTask(null);
      }
    }
  }

  function cancelOperation() {
    abortRef.current?.abort();
    setOperationStatus("Operación cancelada.");
  }

  async function runStringExtraction() {
    if (!file) return;
    const source = file;
    const operationVersion = operationVersionRef.current;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setBusy(true);
    setCancellableTask("strings");
    setOperationStatus("Extrayendo cadenas ASCII imprimibles…");
    try {
      const results = await extractAsciiStringsFromBlob(source, stringMinimum, stringFilter, caseSensitive, controller.signal);
      if (operationVersionRef.current !== operationVersion) return;
      setStrings(results);
      setOperationStatus(`${results.length.toLocaleString("es-ES")} cadena(s) encontradas; máximo ${MAX_STRING_RESULTS}. No se realiza extracción Unicode completa.`);
    } catch (reason) {
      if (operationVersionRef.current === operationVersion) {
        setOperationStatus(reason instanceof DOMException && reason.name === "AbortError"
          ? "Extracción cancelada."
          : reason instanceof Error ? reason.message : "No se pudieron extraer cadenas.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
        setCancellableTask(null);
      }
    }
  }

  async function calculateSha256() {
    if (!file) return;
    const source = file;
    const operationVersion = operationVersionRef.current;
    setBusy(true);
    setOperationStatus("Calculando SHA-256 localmente…");
    try {
      const result = await digestFile("SHA-256", source);
      if (operationVersionRef.current !== operationVersion) return;
      setSha256(result);
      setOperationStatus("SHA-256 calculado. Sirve para comparar contenido con una referencia; no demuestra autenticidad por sí solo.");
    } catch (reason) {
      if (operationVersionRef.current === operationVersion) {
        setOperationStatus(reason instanceof Error ? reason.message : "No se pudo calcular SHA-256.");
      }
    } finally {
      if (operationVersionRef.current === operationVersion) setBusy(false);
    }
  }

  async function copy(value: string, description: string) {
    try {
      await copyToClipboard(value, description);
      setCopyStatus(`${description} copiado.`);
    } catch (reason) {
      setCopyStatus(reason instanceof Error ? reason.message : "No se pudo copiar.");
    }
  }

  function downloadText(text: string, filename: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createReport() {
    if (!file) return;
    const report = buildInspectionReport({
      analyzedAt: new Date().toISOString(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      signatureMatches: signature?.matches ?? [],
      signatureWarning: signature?.warning ?? "Cabecera todavía no leída.",
      sha256,
      hexRange: loadedHexRange,
      search: { kind: searchKind, query: searchQuery, offsets: searchOffsets },
      stringCount: strings.length,
      stringMinimum,
      json: jsonResult ? { rootType: jsonResult.rootType, keys: jsonResult.keys, error: jsonResult.error } : null,
      csv: csvResult ? { headers: csvResult.headers, dataRowCount: csvResult.dataRowCount, errors: csvResult.errors, truncated: csvResult.truncated } : null,
      observations,
    });
    downloadText(report, `${file.name}.inspection.txt`);
    setOperationStatus("Informe TXT generado localmente; no es una certificación forense.");
  }

  const localDate = file ? new Date(file.lastModified) : null;

  return (
    <section className="page-view tool-page lab-page file-inspector-page">
      <SectionHeader eyebrow={<><span className="eyebrow-line" /> LOCAL FORENSICS / READ ONLY</>} title={<>File <span>inspector.</span></>} description="Inspección estática local. Los archivos no se ejecutan, guardan ni transmiten." status="PROCESAMIENTO LOCAL" />

      <div
        className={`file-drop-zone ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="region"
        aria-label="Zona para seleccionar o arrastrar un archivo"
      >
        <input ref={fileInputRef} id="file-inspector-input" className="visually-hidden" type="file" onChange={onFileChange} />
        <span className="file-drop-mark" aria-hidden="true">▧</span>
        <div><strong>{file ? file.name : "Selecciona o arrastra un archivo"}</strong><p>{file ? "El archivo permanece en memoria mientras dure esta sesión." : "No se carga a ningún servicio remoto ni se conserva al salir de la página."}</p></div>
        <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>Elegir archivo</button>
        {file && <button type="button" className="text-button" onClick={() => chooseFile(null)}>Eliminar archivo</button>}
      </div>

      {file ? (
        <>
          <div className="file-status-row" role="status"><span className="status-indicator" />{analysisStatus}</div>
          <div className="file-inspector-grid">
            <section className="panel file-panel">
              <div className="panel-heading"><div><span className="panel-kicker">01 / FILE METADATA</span><h2>Información del archivo</h2></div></div>
              <dl className="file-metadata">
                <div><dt>Nombre</dt><dd>{file.name}</dd></div>
                <div><dt>Tamaño</dt><dd>{formatFileSize(file.size)}</dd></div>
                <div><dt>Extensión</dt><dd>{fileExtension(file.name)}</dd></div>
                <div><dt>MIME declarado</dt><dd>{file.type || "no declarado"}</dd></div>
                <div><dt>Modificado · local</dt><dd>{localDate?.toLocaleString() ?? "—"}</dd></div>
                <div><dt>Modificado · UTC</dt><dd>{localDate?.toISOString() ?? "—"}</dd></div>
                <div><dt>Estado del análisis</dt><dd>{analysisStatus}</dd></div>
              </dl>
            </section>

            <section className="panel file-panel">
              <div className="panel-heading"><div><span className="panel-kicker">02 / MAGIC BYTES</span><h2>Inspección de cabecera</h2></div></div>
              {signature ? (
                <>
                  <div className="signature-details"><div><span>OFFSET INICIAL</span><code>{signature.offset}</code></div><div><span>HEX</span><code>{signature.hex || "—"}</code></div><div><span>DECIMAL</span><code>{signature.decimal || "—"}</code></div><div><span>ASCII IMPRIMIBLE</span><code>{signature.ascii || "—"}</code></div></div>
                  <div className="signature-found"><span>FIRMA / CANDIDATOS</span><strong>{signature.matches.length ? signature.matches.join(" · ") : "Sin firma conocida"}</strong></div>
                  {signature.warning && <p className="notice notice-warning">{signature.warning}</p>}
                  {signature.matches.includes("MZ (DOS/PE candidate)") && <p className="notice">La cabecera MZ es compatible con ejecutables DOS o con un ejecutable que contenga una cabecera PE; la firma PE no se valida aquí.</p>}
                  <p className="microcopy">Una firma reconocida no garantiza que el archivo sea seguro; una firma desconocida tampoco significa que esté corrupto.</p>
                </>
              ) : <p className="microcopy">Leyendo la cabecera del archivo…</p>}
            </section>
          </div>

          <section className="panel file-panel">
            <div className="panel-heading"><div><span className="panel-kicker">03 / HEX VIEWER</span><h2>Visor hexadecimal</h2></div></div>
            <div className="file-controls">
              <label className="file-control">Offset (bytes)<input className="field-input" type="number" min="0" max={file.size} value={hexOffset} onChange={(event) => setHexOffset(event.target.value)} /></label>
              <label className="file-control">Bytes por fila<select className="field-input" value={bytesPerRow} onChange={(event) => { const next = Number(event.target.value); setBytesPerRow(next); void loadHexRange(file, hexOffset, next); }}>{rowOptions.map((size) => <option value={size} key={size}>{size}</option>)}</select></label>
              <button type="button" className="secondary-button" onClick={() => void loadHexRange(file, hexOffset, bytesPerRow)}>Leer rango</button>
              <button type="button" className="secondary-button" disabled={!hexView} onClick={() => void copy(hexView, "Rango visible")}>Copiar rango visible</button>
            </div>
            <pre className="file-hex-view" aria-label="Bytes en formato hexadecimal">{hexView || "El archivo no contiene bytes para mostrar."}</pre>
            <div className="file-controls file-search-controls">
              <label className="file-control">Buscar como<select className="field-input" value={searchKind} onChange={(event) => { if (cancellableTask === "search") abortRef.current?.abort(); setSearchKind(event.target.value as "hex" | "text"); setSearchOffsets([]); setSearchIndex(0); }}><option value="hex">Hexadecimal</option><option value="text">Texto UTF-8</option></select></label>
              <label className="file-control file-grow">Secuencia<input className="field-input" value={searchQuery} onChange={(event) => { if (cancellableTask === "search") abortRef.current?.abort(); setSearchQuery(event.target.value); setSearchOffsets([]); setSearchIndex(0); }} placeholder={searchKind === "hex" ? "50 4B 03 04" : "texto UTF-8"} /></label>
              <button type="button" className="primary-button" onClick={() => void runSearch()} disabled={busy || !searchQuery}>Buscar</button>
              {cancellableTask && <button type="button" className="secondary-button" onClick={cancelOperation}>{cancellableTask === "search" ? "Cancelar búsqueda" : "Cancelar extracción"}</button>}
            </div>
            <div className="match-navigation">
              <span>{searchOffsets.length ? `${searchIndex + 1} / ${searchOffsets.length} · offset ${searchOffsets[searchIndex]}` : "Sin coincidencias listadas"}</span>
              <button type="button" className="text-button" disabled={!searchOffsets.length} onClick={() => setSearchIndex((index) => (index - 1 + searchOffsets.length) % searchOffsets.length)}>Anterior</button>
              <button type="button" className="text-button" disabled={!searchOffsets.length} onClick={() => setSearchIndex((index) => (index + 1) % searchOffsets.length)}>Siguiente</button>
              {searchOffsets.length > 0 && <button type="button" className="text-button" onClick={() => { const nextOffset = String(searchOffsets[searchIndex]); setHexOffset(nextOffset); void loadHexRange(file, nextOffset, bytesPerRow); }}>Ver coincidencia</button>}
            </div>
            <p className="microcopy">Búsqueda limitada a 50 MiB, patrones de hasta 1024 bytes y {MAX_SEARCH_RESULTS} resultados; la lectura del visor usa rangos Blob.slice().</p>
          </section>

          <div className="file-inspector-grid">
            <section className="panel file-panel">
              <div className="panel-heading"><div><span className="panel-kicker">04 / STRINGS</span><h2>Extracción de cadenas</h2></div></div>
              <div className="file-controls">
                <label className="file-control">Longitud mínima<input className="field-input" type="number" min="1" max="128" value={stringMinimum} onChange={(event) => { setStringMinimum(Number(event.target.value)); setStrings([]); }} /></label>
                <label className="file-control file-grow">Filtro literal<input className="field-input" value={stringFilter} onChange={(event) => { setStringFilter(event.target.value); setStrings([]); }} /></label>
              </div>
              <label className="file-checkbox"><input type="checkbox" checked={caseSensitive} onChange={(event) => { setCaseSensitive(event.target.checked); setStrings([]); }} /> Sensible a mayúsculas</label>
              <div className="action-row"><button type="button" className="primary-button" onClick={() => void runStringExtraction()} disabled={busy}>Extraer cadenas ASCII</button><button type="button" className="secondary-button" disabled={!strings.length} onClick={() => void copy(strings.map((item) => `${item.offset}\t${item.value}`).join("\n"), "Resultados")}>Copiar resultados</button><button type="button" className="secondary-button" disabled={!strings.length} onClick={() => downloadText(strings.map((item) => `${item.offset}\t${item.value}`).join("\n"), `${file.name}.strings.txt`)}>Descargar TXT</button></div>
              <p className="notice">Se extrae ASCII imprimible, no Unicode completo. Límite de entrada: 50 MiB; máximo {MAX_STRING_RESULTS} resultados.</p>
              <div className="strings-results" aria-live="polite">{strings.slice(0, 100).map((item) => <div key={`${item.offset}-${item.value}`}><code>{item.offset}</code><span>{item.value}</span></div>)}{strings.length > 100 && <p className="microcopy">Se muestran 100 de {strings.length}; copiar o descargar incluye todos los resultados.</p>}</div>
            </section>

            <section className="panel file-panel">
              <div className="panel-heading"><div><span className="panel-kicker">05 / SHA-256</span><h2>Hash de archivo</h2></div></div>
              <p className="microcopy">El cálculo usa la implementación existente de Hash Lab. Límite: 50 MiB; se procesa en memoria mediante Web Crypto.</p>
              <button type="button" className="primary-button" onClick={() => void calculateSha256()} disabled={busy || file.size > MAX_FILE_OPERATION_SIZE}>Calcular SHA-256</button>
              {sha256 && <div className="hash-result file-hash-result"><span>{file.name} · {formatFileSize(file.size)}</span><code>{sha256}</code><button type="button" className="text-button" onClick={() => void copy(sha256, "SHA-256")}>Copiar hash</button></div>}
              <p className="notice">Un hash permite verificar igualdad de contenido frente a una referencia confiable; por sí solo no demuestra autenticidad.</p>
            </section>
          </div>

          {(jsonResult || csvText !== null || (fileExtension(file.name) === "json" && jsonResult) || (fileExtension(file.name) === "csv" && csvResult)) && (
            <section className="panel file-panel">
              <div className="panel-heading"><div><span className="panel-kicker">06 / STRUCTURED DATA</span><h2>Análisis JSON / CSV</h2></div></div>
              {jsonResult && (
                <div className="structured-result">
                  <h3>Análisis JSON</h3>
                  {jsonResult.error ? <p className="error-message" role="alert">Error de sintaxis o límite de lectura: {jsonResult.error}</p> : <><p className="microcopy">JSON válido · tipo raíz: <strong>{jsonResult.rootType}</strong></p>{jsonResult.keys.length > 0 && <p className="microcopy">Claves de primer nivel: {jsonResult.keys.join(", ")}</p>}<pre className="file-json-view">{jsonResult.formatted}</pre></>}
                </div>
              )}
              {csvResult && (
                <div className="structured-result">
                  <h3>Análisis CSV</h3>
                  {csvText !== null && <p className="microcopy">{csvDetection?.conclusive ? "Separador detectado automáticamente" : "La detección no es concluyente; selecciona el separador si es necesario."}</p>}
                  <label className="file-control">Separador<select className="field-input" value={csvSeparatorChoice} onChange={(event) => setCsvSeparatorChoice(event.target.value)}><option value="AUTO">Detección automática</option><option value=",">Coma</option><option value=";">Punto y coma</option><option value="Tab">Tabulación</option><option value="|">Barra vertical</option></select></label>
                  <p className="microcopy">{csvResult.truncated ? "Al menos " : ""}{csvResult.dataRowCount.toLocaleString("es-ES")} filas de datos{csvResult.truncated ? " (límite de filas alcanzado)" : ""} · separador {selectedDelimiter === "\t" ? "tabulación" : selectedDelimiter}</p>
                  {csvResult.errors.length > 0 && <ul className="csv-errors">{csvResult.errors.slice(0, 20).map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>}
                  {csvResult.headers.length > 0 && <div className="csv-table-wrap"><table className="file-csv-table"><thead><tr>{csvResult.headers.map((header, index) => <th key={`${index}-${header}`}>{header || `Columna ${index + 1}`}</th>)}</tr></thead><tbody>{csvResult.rows.slice(0, 10).map((row, rowIndex) => <tr key={rowIndex}>{csvResult.headers.map((_, columnIndex) => <td key={columnIndex}>{row[columnIndex] ?? ""}</td>)}</tr>)}</tbody></table></div>}
                  <p className="microcopy">Se muestran las primeras 10 filas. Los valores se presentan como texto sin ejecutar ni interpretar HTML.</p>
                </div>
              )}
            </section>
          )}

          <section className="panel file-panel">
            <div className="panel-heading"><div><span className="panel-kicker">07 / REPORT</span><h2>Informe de inspección</h2></div></div>
            <label className="field-label" htmlFor="inspection-observations">Observaciones del usuario</label>
            <textarea id="inspection-observations" className="field-input field-textarea" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Notas opcionales; no se guardan automáticamente." />
            <div className="action-row"><button type="button" className="primary-button" onClick={createReport}>Descargar informe TXT</button>{copyStatus && <span className="microcopy" role="status">{copyStatus}</span>}</div>
            {operationStatus && <p className="microcopy" role="status">{operationStatus}</p>}
            <p className="notice notice-warning">El informe no es una certificación forense ni una garantía de cadena de custodia.</p>
          </section>
        </>
      ) : (
        <div className="empty-state file-empty-state"><span>⌁</span><p>Elige un archivo o arrástralo aquí. No se escribe información en almacenamiento persistente.</p></div>
      )}
    </section>
  );
}
