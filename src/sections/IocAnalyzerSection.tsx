import { useEffect, useState, type ChangeEvent } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { copyToClipboard } from "../lib/feedback";
import {
  analyzeIocs,
  defangIocText,
  formatIocsCsv,
  formatIocsText,
  iocsByCategory,
  IOC_FILE_SIZE_LIMIT,
  IOC_TEXT_LIMIT,
  refangIocText,
  type IocAnalysis,
  type IocCategory,
} from "../lib/iocAnalyzer";

const categoryLabels: Array<{ id: IocCategory; label: string }> = [
  { id: "ipv4", label: "IPv4" },
  { id: "ipv6", label: "IPv6" },
  { id: "domain", label: "Dominios" },
  { id: "url", label: "URLs" },
  { id: "email", label: "Correos" },
  { id: "hash", label: "Hashes" },
  { id: "cve", label: "CVE" },
  { id: "path", label: "Rutas" },
];

export function IocAnalyzerSection({ initialText = "" }: { initialText?: string }) {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<IocAnalysis | null>(null);
  const [transformResult, setTransformResult] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<IocCategory>("ipv4");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (!initialText) return;
    try {
      if (initialText.length > IOC_TEXT_LIMIT) throw new Error("Los indicadores recibidos superan el límite de procesamiento de 1.000.000 caracteres.");
      setText(initialText);
      setAnalysis(analyzeIocs(initialText));
      setError("");
      setMessage("Indicadores recibidos localmente desde Log Analyzer.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron analizar los indicadores recibidos.");
    }
  }, [initialText]);

  function runAnalysis() {
    setError("");
    setMessage("");
    try {
      setAnalysis(analyzeIocs(text));
    } catch (reason) {
      setAnalysis(null);
      setError(reason instanceof Error ? reason.message : "No se pudieron extraer indicadores.");
    }
  }

  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > IOC_FILE_SIZE_LIMIT) {
      setError(`El archivo supera el límite de ${Math.floor(IOC_FILE_SIZE_LIMIT / 1024 / 1024)} MiB; reduce o divide el archivo antes de analizarlo.`);
      event.target.value = "";
      return;
    }
    try {
      const content = await file.text();
      if (content.length > IOC_TEXT_LIMIT) throw new Error("El texto extraído supera el límite de procesamiento de 1.000.000 caracteres.");
      setText(content);
      setFileName(file.name);
      setAnalysis(null);
      setError("");
      setMessage("Archivo leído localmente en memoria; no se ha subido.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo leer el archivo local.");
    } finally {
      event.target.value = "";
    }
  }

  async function copyCategory() {
    if (!analysis) return;
    const values = iocsByCategory(analysis, selectedCategory);
    try {
      await copyToClipboard(values.join("\n"), `indicadores de ${selectedCategory}`);
      setMessage(`${values.length} indicador(es) de ${selectedCategory} copiados.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo copiar la categoría.");
    }
  }

  function download(format: "csv" | "json" | "txt") {
    if (!analysis) return;
    const body = format === "csv"
      ? formatIocsCsv(analysis.records)
      : format === "json"
        ? JSON.stringify({ counts: analysis.counts, indicators: analysis.records }, null, 2)
        : formatIocsText(analysis.records);
    const mimeType = format === "json"
      ? "application/json;charset=utf-8"
      : format === "csv"
        ? "text/csv;charset=utf-8"
        : "text/plain;charset=utf-8";
    const blob = new Blob([body], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `s0ul74-ioc-report.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const totalCount = analysis?.records.length ?? 0;
  return (
    <section className="page-view tool-page lab-page ioc-page">
      <SectionHeader
        eyebrow={<><span className="eyebrow-line violet-line" /> IOC / LOCAL TRIAGE</>}
        title={<>IOC <span className="violet-text">analyzer.</span></>}
        description="Extrae y organiza posibles indicadores de texto o archivos locales; no consulta servicios externos."
        status="LOCAL ONLY"
        statusClass="violet-status"
      />
      <div className="notice notice-warning">Los resultados son indicadores sintácticos, no veredictos de malware ni confirmaciones de actividad. No se valida reputación, resolución DNS, firmas ni contenido ejecutable.</div>
      <section className="panel ioc-input-panel">
        <div className="panel-heading"><div><span className="panel-kicker">01 / INPUT</span><h2>Texto o archivo local</h2></div><span className="live-counter">{text.length.toLocaleString("es-ES")} / {IOC_TEXT_LIMIT.toLocaleString("es-ES")}</span></div>
        <label className="field-label" htmlFor="ioc-file">Archivo de texto (máximo {Math.floor(IOC_FILE_SIZE_LIMIT / 1024 / 1024)} MiB)</label>
        <input id="ioc-file" className="field-input file-input" type="file" accept=".txt,.log,.csv,.json,text/plain,text/csv,application/json" onChange={(event) => void loadFile(event)} />
        {fileName && <p className="microcopy">Archivo en memoria: {fileName}</p>}
        <label className="field-label" htmlFor="ioc-text">Pega texto, logs, URLs o indicadores</label>
        <textarea id="ioc-text" className="field-input field-textarea ioc-textarea" value={text} maxLength={IOC_TEXT_LIMIT} onChange={(event) => setText(event.target.value)} placeholder="Ejemplo: hxxps://example[.]org CVE-2024-12345 192.168.1.10" />
        <div className="action-row">
          <button type="button" className="primary-button" onClick={runAnalysis}>Extraer indicadores</button>
          <button type="button" className="secondary-button" onClick={() => { setTransformResult(refangIocText(text)); setMessage("Vista refang generada localmente."); }}>Refang</button>
          <button type="button" className="secondary-button" onClick={() => { setTransformResult(defangIocText(text)); setMessage("Vista defang generada localmente."); }}>Defang</button>
          <button type="button" className="secondary-button" onClick={() => { setText(""); setAnalysis(null); setTransformResult(""); setFileName(""); setError(""); setMessage(""); }}>Limpiar</button>
        </div>
        {transformResult && <div className="ioc-transform-result"><code>{transformResult}</code><button type="button" className="secondary-button" onClick={() => void copyToClipboard(transformResult, "texto transformado").then(() => setMessage("Texto transformado copiado.")).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "No se pudo copiar."))}>Copiar transformación</button></div>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {message && <p className="microcopy" role="status">{message}</p>}
      </section>

      {analysis && (
        <section className="panel ioc-results-panel" aria-live="polite">
          <div className="panel-heading"><div><span className="panel-kicker">02 / LOCAL RESULTS</span><h2>{totalCount} indicador(es)</h2></div></div>
          <div className="ioc-count-grid">
            {categoryLabels.map(({ id, label }) => <div className="ioc-count-card" key={id}><span>{label}</span><strong>{analysis.counts[id]}</strong></div>)}
          </div>
          <div className="ioc-export-actions">
            <label className="file-control">Categoría para copiar<select className="field-input" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as IocCategory)}>{categoryLabels.map(({ id, label }) => <option value={id} key={id}>{label} ({analysis.counts[id]})</option>)}</select></label>
            <button type="button" className="secondary-button" onClick={() => void copyCategory()} disabled={analysis.counts[selectedCategory] === 0}>Copiar categoría</button>
            <button type="button" className="secondary-button" onClick={() => download("csv")}>Exportar CSV</button>
            <button type="button" className="secondary-button" onClick={() => download("json")}>Exportar JSON</button>
            <button type="button" className="secondary-button" onClick={() => download("txt")}>Exportar TXT</button>
          </div>
          {analysis.records.length ? (
            <div className="ioc-record-list">
              {analysis.records.map((record) => <div className="ioc-record" key={`${record.category}-${record.value}`}>
                <span className="ioc-record-category">{record.category}</span>
                <code>{record.value}</code>
                {record.ipClassification && <span className="ioc-ip-class">{record.ipClassification}</span>}
              </div>)}
            </div>
          ) : <div className="empty-state compact-empty"><span>⌕</span><p>No se encontraron indicadores de las categorías admitidas.</p></div>}
          <p className="notice notice-warning">La defang/refang es transformación textual. El analizador no resuelve dominios, no abre URLs, no ejecuta archivos, no confirma reputación ni determina si un indicador es malicioso.</p>
        </section>
      )}
    </section>
  );
}
